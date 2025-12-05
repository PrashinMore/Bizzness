import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceFromSaleDto } from './dto/create-invoice-from-sale.dto';
import { UpdateInvoiceSettingsDto } from './dto/update-invoice-settings.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { SanitizedUser } from '../users/users.types';
import { readFile } from 'fs/promises';
import { join } from 'path';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  private getOrganizationId(user: SanitizedUser, orgId: string): string {
    if (!user.organizations || user.organizations.length === 0) {
      throw new NotFoundException('You must be assigned to at least one organization');
    }

    const hasAccess = user.organizations.some((org) => org.id === orgId);
    if (!hasAccess) {
      throw new NotFoundException('Organization not found or access denied');
    }

    return orgId;
  }

  @Post('from-sale/:saleId')
  async createFromSale(
    @Req() req: RequestWithUser,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Param('saleId', new ParseUUIDPipe({ version: '4' })) saleId: string,
    @Body() dto: CreateInvoiceFromSaleDto,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    const invoice = await this.invoicesService.createFromSale(
      organizationId,
      saleId,
      dto,
      req.user.id,
    );

    return {
      invoice,
      status: invoice.pdfUrl ? 'ready' : 'queued',
      pdfUrl: invoice.pdfUrl,
    };
  }

  @Get('settings')
  async getSettings(
    @Req() req: RequestWithUser,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    return this.invoicesService.getInvoiceSettings(organizationId);
  }

  @Post('settings')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateSettings(
    @Req() req: RequestWithUser,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Body() dto: UpdateInvoiceSettingsDto,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    return this.invoicesService.updateInvoiceSettings(organizationId, dto);
  }

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Query() query: ListInvoicesDto,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    return this.invoicesService.findAll(organizationId, query);
  }

  @Get(':invoiceId')
  async findOne(
    @Req() req: RequestWithUser,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Param('invoiceId', new ParseUUIDPipe({ version: '4' })) invoiceId: string,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    const invoice = await this.invoicesService.findOne(invoiceId, organizationId);
    return {
      invoice,
      status: invoice.pdfUrl ? 'ready' : 'queued',
      pdfUrl: invoice.pdfUrl,
    };
  }

  @Get(':invoiceId/pdf')
  async getPdf(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Param('invoiceId', new ParseUUIDPipe({ version: '4' })) invoiceId: string,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    const invoice = await this.invoicesService.findOne(invoiceId, organizationId);

    if (!invoice.pdfUrl) {
      // Generate PDF if not exists
      await this.invoicesService.generatePdfForInvoice(invoiceId, organizationId);
      const updatedInvoice = await this.invoicesService.findOne(invoiceId, organizationId);
      
      if (!updatedInvoice.pdfUrl) {
        throw new NotFoundException('PDF not available');
      }

      invoice.pdfUrl = updatedInvoice.pdfUrl;
    }

    // Extract file path from URL
    const filePath = invoice.pdfUrl.replace('/uploads/', '');
    const fullPath = join(process.cwd(), 'uploads', filePath);

    try {
      const pdfBuffer = await readFile(fullPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${invoice.invoiceNumber}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      throw new NotFoundException('PDF file not found');
    }
  }

  @Post(':invoiceId/generate-pdf')
  async generatePdf(
    @Req() req: RequestWithUser,
    @Param('orgId', new ParseUUIDPipe({ version: '4' })) orgId: string,
    @Param('invoiceId', new ParseUUIDPipe({ version: '4' })) invoiceId: string,
    @Query('force') force?: string,
  ) {
    const organizationId = this.getOrganizationId(req.user, orgId);
    const forceRegenerate = force === 'true';
    await this.invoicesService.generatePdfForInvoice(invoiceId, organizationId, forceRegenerate);
    const invoice = await this.invoicesService.findOne(invoiceId, organizationId);
    return {
      invoice,
      status: invoice.pdfUrl ? 'ready' : 'queued',
      pdfUrl: invoice.pdfUrl,
    };
  }
}

