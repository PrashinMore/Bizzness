import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceCounter } from './entities/invoice-counter.entity';
import { OrganizationInvoiceSettings } from './entities/organization-invoice-settings.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Settings } from '../settings/entities/settings.entity';
import { Product } from '../products/entities/product.entity';
import { CreateInvoiceFromSaleDto } from './dto/create-invoice-from-sale.dto';
import { UpdateInvoiceSettingsDto } from './dto/update-invoice-settings.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { StorageService } from '../products/storage.service';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceCounter)
    private readonly counterRepo: Repository<InvoiceCounter>,
    @InjectRepository(OrganizationInvoiceSettings)
    private readonly settingsRepo: Repository<OrganizationInvoiceSettings>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Settings)
    private readonly businessSettingsRepo: Repository<Settings>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly storageService: StorageService,
  ) {}

  async getOrCreateInvoiceSettings(
    organizationId: string,
  ): Promise<OrganizationInvoiceSettings> {
    let settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.settingsRepo.create({ organizationId });
      settings = await this.settingsRepo.save(settings);
    }

    return settings;
  }

  async updateInvoiceSettings(
    organizationId: string,
    dto: UpdateInvoiceSettingsDto,
  ): Promise<OrganizationInvoiceSettings> {
    const settings = await this.getOrCreateInvoiceSettings(organizationId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  async getInvoiceSettings(
    organizationId: string,
  ): Promise<OrganizationInvoiceSettings> {
    return this.getOrCreateInvoiceSettings(organizationId);
  }

  private computePeriod(
    resetCycle: 'never' | 'monthly' | 'yearly',
    date: Date = new Date(),
  ): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    switch (resetCycle) {
      case 'monthly':
        return `${year}-${month}`;
      case 'yearly':
        return String(year);
      case 'never':
      default:
        return 'global';
    }
  }

  private padSerial(serial: number, padding: number): string {
    return String(serial).padStart(padding, '0');
  }

  private composeInvoiceNumber(
    settings: OrganizationInvoiceSettings,
    branchId: string | null | undefined,
    period: string,
    serial: number,
  ): string {
    const prefix = settings.invoicePrefix || 'INV';
    const paddedSerial = this.padSerial(serial, settings.invoicePadding);

    if (settings.invoiceBranchPrefix && branchId) {
      // Use first 2 chars of branch ID as code (or implement branch code lookup)
      const branchCode = branchId.substring(0, 2).toUpperCase();
      return `${prefix}-${branchCode}-${period}-${paddedSerial}`;
    }

    return `${prefix}-${period}-${paddedSerial}`;
  }

  async createFromSale(
    organizationId: string,
    saleId: string,
    dto: CreateInvoiceFromSaleDto,
    userId: string,
  ): Promise<Invoice> {
    // 1. Load sale and validate
    const sale = await this.saleRepo.findOne({
      where: { id: saleId, organizationId },
      relations: ['items'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${saleId} not found`);
    }

    // 2. Check existing invoice (idempotency)
    const existing = await this.invoiceRepo.findOne({
      where: { billingSessionId: saleId },
    });

    if (existing) {
      return existing;
    }

    // 3. Get invoice settings
    const invoiceSettings = await this.getOrCreateInvoiceSettings(organizationId);

    if (!invoiceSettings.enableInvoices) {
      throw new BadRequestException('Invoices are disabled for this organization');
    }

    // 4. Get business settings
    const businessSettings = await this.businessSettingsRepo.findOne({
      where: { organizationId },
    });

    if (!businessSettings) {
      throw new NotFoundException('Business settings not found');
    }

    // 5. Compute period
    const period = this.computePeriod(
      invoiceSettings.invoiceResetCycle,
      sale.date || sale.createdAt,
    );

    // 6. Transaction: lock counter and create invoice
    const invoice = await this.dataSource.transaction(async (manager) => {
      // Lock counter row
      const counter = await manager
        .getRepository(InvoiceCounter)
        .createQueryBuilder('ic')
        .setLock('pessimistic_write')
        .where(
          'ic.organization_id = :orgId AND (ic.branch_id IS NOT DISTINCT FROM :branchId) AND ic.period = :period',
          {
            orgId: organizationId,
            branchId: null, // No branch support yet
            period,
          },
        )
        .getOne();

      let serial: number;
      if (!counter) {
        const newCounter = manager.getRepository(InvoiceCounter).create({
          organizationId,
          branchId: null,
          period,
          lastSerial: 1,
        });
        await manager.getRepository(InvoiceCounter).save(newCounter);
        serial = 1;
      } else {
        counter.lastSerial += 1;
        await manager.getRepository(InvoiceCounter).save(counter);
        serial = counter.lastSerial;
      }

      const invoiceNumber = this.composeInvoiceNumber(
        invoiceSettings,
        null,
        period,
        serial,
      );

      // Fetch product names
      const productIds = sale.items.map((item) => item.productId);
      const products = await manager.getRepository(Product).find({
        where: productIds.map((id) => ({ id })),
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Calculate totals
      const items = sale.items.map((item) => {
        const rate = parseFloat(item.sellingPrice.toString());
        const qty = item.quantity;
        const subtotal = rate * qty;
        const taxRate = invoiceSettings.gstEnabled
          ? parseFloat(businessSettings.taxRate.toString()) / 100
          : 0;
        const tax = subtotal * taxRate;
        const product = productMap.get(item.productId);

        return {
          productId: item.productId,
          name: product?.name || `Product ${item.productId}`,
          quantity: qty,
          rate,
          total: subtotal + tax,
          tax,
        };
      });

      const subtotal = items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
      const taxAmount = items.reduce((sum, item) => sum + (item.tax || 0), 0);
      const total = subtotal + taxAmount;

      // Generate HTML snapshot
      const htmlSnapshot = this.pdfGenerator.generateInvoiceHtml(
        {
          ...new Invoice(),
          invoiceNumber,
          items,
          subtotal,
          taxAmount,
          discountAmount: 0,
          total,
          createdAt: new Date(),
        } as Invoice,
        invoiceSettings,
        businessSettings,
      );

      // Create invoice
      const invoice = manager.getRepository(Invoice).create({
        organizationId,
        branchId: null,
        billingSessionId: saleId,
        invoiceNumber,
        invoicePrefix: invoiceSettings.invoicePrefix,
        invoiceSerial: serial,
        invoicePeriod: period,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerGstin: dto.customerGstin,
        items,
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        htmlSnapshot,
        createdBy: userId,
      });

      return await manager.getRepository(Invoice).save(invoice);
    });

    // 7. Generate PDF (sync or async)
    if (dto.forceSyncPdf) {
      await this.generatePdfForInvoice(invoice.id, organizationId);
    } else {
      // In production, enqueue background job here
      // For now, generate synchronously
      this.generatePdfForInvoice(invoice.id, organizationId).catch((err) => {
        this.logger.error('Failed to generate PDF in background', err);
      });
    }

    return invoice;
  }

  async generatePdfForInvoice(
    invoiceId: string,
    organizationId: string,
    forceRegenerate: boolean = false,
  ): Promise<void> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.pdfUrl && !forceRegenerate) {
      return; // Already generated
    }

    const invoiceSettings = await this.getOrCreateInvoiceSettings(organizationId);
    const businessSettings = await this.businessSettingsRepo.findOne({
      where: { organizationId },
    });

    if (!businessSettings) {
      throw new NotFoundException('Business settings not found');
    }

    try {
      // Regenerate HTML snapshot with correct logo (base64)
      const htmlSnapshot = this.pdfGenerator.generateInvoiceHtml(
        invoice,
        invoiceSettings,
        businessSettings,
      );
      invoice.htmlSnapshot = htmlSnapshot;

      const pdfBuffer = await this.pdfGenerator.generateInvoicePdf(
        invoice,
        invoiceSettings,
        businessSettings,
      );

      // Save PDF to storage
      const uploadPath = this.storageService.getUploadPath('business');
      const invoicesPath = join(uploadPath, 'invoices', organizationId);

      if (!existsSync(invoicesPath)) {
        await mkdir(invoicesPath, { recursive: true });
      }

      const filename = `${invoice.invoiceNumber}.pdf`;
      const filepath = join(invoicesPath, filename);
      await writeFile(filepath, pdfBuffer);

      const pdfUrl = `/uploads/business/invoices/${organizationId}/${filename}`;

      invoice.pdfUrl = pdfUrl;
      await this.invoiceRepo.save(invoice);
    } catch (error) {
      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}`, error);
      throw error;
    }
  }

  async findOne(
    invoiceId: string,
    organizationId: string,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return invoice;
  }

  async findAll(
    organizationId: string,
    dto: ListInvoicesDto,
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.organizationId = :organizationId', { organizationId })
      .orderBy('invoice.createdAt', 'DESC');

    if (dto.from) {
      qb.andWhere('invoice.createdAt >= :from', { from: dto.from });
    }

    if (dto.to) {
      qb.andWhere('invoice.createdAt <= :to', { to: dto.to });
    }

    if (dto.customer) {
      qb.andWhere('invoice.customerName ILIKE :customer', {
        customer: `%${dto.customer}%`,
      });
    }

    const total = await qb.getCount();

    if (dto.page && dto.size) {
      qb.skip((dto.page - 1) * dto.size).take(dto.size);
    }

    const invoices = await qb.getMany();

    return { invoices, total };
  }
}

