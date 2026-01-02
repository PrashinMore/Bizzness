import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, LessThan, MoreThanOrEqual } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerVisit } from './entities/customer-visit.entity';
import { CustomerNote } from './entities/customer-note.entity';
import { CustomerFeedback } from './entities/customer-feedback.entity';
import { LoyaltyAccount } from './entities/loyalty-account.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { CreateCustomerFeedbackDto } from './dto/create-customer-feedback.dto';
import { UpdateCustomerFeedbackDto } from './dto/update-customer-feedback.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerVisit)
    private readonly visitRepo: Repository<CustomerVisit>,
    @InjectRepository(CustomerNote)
    private readonly noteRepo: Repository<CustomerNote>,
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepo: Repository<CustomerFeedback>,
    @InjectRepository(LoyaltyAccount)
    private readonly loyaltyRepo: Repository<LoyaltyAccount>,
    private readonly settingsService: SettingsService,
  ) {}

  async ensureCrmEnabled(organizationId: string): Promise<void> {
    const settings = await this.settingsService.getSettings(organizationId);
    if (!settings.enableCRM) {
      throw new ForbiddenException('CRM is not enabled for this organization');
    }
  }

  async findOrCreateCustomer(
    phone: string,
    organizationId: string,
    createData?: Partial<CreateCustomerDto>,
  ): Promise<Customer> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/\D/g, '');

    let customer = await this.customerRepo.findOne({
      where: { phone: normalizedPhone, organizationId },
    });

    if (!customer) {
      customer = this.customerRepo.create({
        phone: normalizedPhone,
        organizationId,
        name: createData?.name || 'Guest',
        email: createData?.email,
        birthday: createData?.birthday ? new Date(createData.birthday) : undefined,
        gender: createData?.gender,
        tags: createData?.tags || [],
        totalVisits: 0,
        totalSpend: 0,
        avgOrderValue: 0,
      });
      customer = await this.customerRepo.save(customer);

      // Create loyalty account if enabled
      const settings = await this.settingsService.getSettings(organizationId);
      if (settings.enableLoyalty) {
        const loyaltyAccount = this.loyaltyRepo.create({
          customerId: customer.id,
          points: 0,
          tier: 'SILVER',
        });
        await this.loyaltyRepo.save(loyaltyAccount);
      }
    }

    return customer;
  }

  async createCustomer(
    dto: CreateCustomerDto,
    organizationId: string,
  ): Promise<Customer> {
    await this.ensureCrmEnabled(organizationId);

    const normalizedPhone = dto.phone.replace(/\D/g, '');
    const existing = await this.customerRepo.findOne({
      where: { phone: normalizedPhone, organizationId },
    });

    if (existing) {
      throw new BadRequestException('Customer with this phone number already exists');
    }

    const customer = this.customerRepo.create({
      ...dto,
      phone: normalizedPhone,
      organizationId,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      tags: dto.tags || [],
      totalVisits: 0,
      totalSpend: 0,
      avgOrderValue: 0,
    });

    const saved = await this.customerRepo.save(customer);

    // Create loyalty account if enabled
    const settings = await this.settingsService.getSettings(organizationId);
    if (settings.enableLoyalty) {
      const loyaltyAccount = this.loyaltyRepo.create({
        customerId: saved.id,
        points: 0,
        tier: 'SILVER',
      });
      await this.loyaltyRepo.save(loyaltyAccount);
    }

    return saved;
  }

  async findAll(
    filters: ListCustomersDto,
    organizationIds: string[],
  ): Promise<{ customers: Customer[]; total: number }> {
    const qb = this.customerRepo
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.loyaltyAccount', 'loyalty')
      .where('customer.organizationId IN (:...organizationIds)', {
        organizationIds,
      });

    if (filters.search) {
      qb.andWhere(
        '(customer.name ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.tag) {
      qb.andWhere(':tag = ANY(customer.tags)', { tag: filters.tag });
    }

    // Handle segments
    if (filters.segment) {
      switch (filters.segment) {
        case 'first-time':
          qb.andWhere('customer.totalVisits = 0');
          break;
        case 'regulars':
          qb.andWhere('customer.totalVisits >= 5');
          break;
        case 'high-spenders':
          qb.andWhere('customer.totalSpend >= 5000');
          break;
        case 'inactive-30':
          qb.andWhere(
            'customer.lastVisitAt IS NULL OR customer.lastVisitAt < :date',
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          );
          break;
        case 'inactive-60':
          qb.andWhere(
            'customer.lastVisitAt IS NULL OR customer.lastVisitAt < :date',
            { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
          );
          break;
      }
    }

    const total = await qb.getCount();

    if (filters.page && filters.size) {
      qb.skip((filters.page - 1) * filters.size).take(filters.size);
    }

    qb.orderBy('customer.lastVisitAt', 'DESC', 'NULLS LAST');
    qb.addOrderBy('customer.createdAt', 'DESC');

    const customers = await qb.getMany();

    return { customers, total };
  }

  async findOne(id: string, organizationIds: string[]): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, organizationId: In(organizationIds) },
      relations: ['loyaltyAccount'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    organizationIds: string[],
  ): Promise<Customer> {
    const customer = await this.findOne(id, organizationIds);

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.birthday !== undefined) {
      customer.birthday = dto.birthday ? new Date(dto.birthday) : null;
    }
    if (dto.gender !== undefined) customer.gender = dto.gender;
    if (dto.tags !== undefined) customer.tags = dto.tags;

    return this.customerRepo.save(customer);
  }

  async createVisit(
    customerId: string,
    orderId: string,
    billAmount: number,
    visitType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
    outletId?: string | null,
  ): Promise<CustomerVisit> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const visit = this.visitRepo.create({
      customerId,
      orderId,
      outletId: outletId || null,
      billAmount,
      visitType,
      visitedAt: new Date(),
    });

    const savedVisit = await this.visitRepo.save(visit);

    // Update customer stats
    customer.totalVisits += 1;
    customer.totalSpend = Number(
      (Number(customer.totalSpend) + billAmount).toFixed(2),
    );
    customer.avgOrderValue = Number(
      (customer.totalSpend / customer.totalVisits).toFixed(2),
    );
    customer.lastVisitAt = new Date();

    await this.customerRepo.save(customer);

    // Update loyalty points if enabled
    const settings = await this.settingsService.getSettings(customer.organizationId);
    if (settings.enableLoyalty) {
      await this.updateLoyaltyPoints(customerId, billAmount);
    }

    return savedVisit;
  }

  async getCustomerVisits(
    customerId: string,
    organizationIds: string[],
  ): Promise<CustomerVisit[]> {
    const customer = await this.findOne(customerId, organizationIds);

    return this.visitRepo.find({
      where: { customerId: customer.id },
      order: { visitedAt: 'DESC' },
      relations: ['sale', 'outlet'],
    });
  }

  async createNote(
    customerId: string,
    dto: CreateCustomerNoteDto,
    userId: string,
    organizationIds: string[],
  ): Promise<CustomerNote> {
    const customer = await this.findOne(customerId, organizationIds);

    const note = this.noteRepo.create({
      customerId: customer.id,
      createdByUserId: userId,
      note: dto.note,
    });

    return this.noteRepo.save(note);
  }

  async getCustomerNotes(
    customerId: string,
    organizationIds: string[],
  ): Promise<CustomerNote[]> {
    const customer = await this.findOne(customerId, organizationIds);

    return this.noteRepo.find({
      where: { customerId: customer.id },
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async createFeedback(
    customerId: string,
    dto: CreateCustomerFeedbackDto,
    organizationIds: string[],
  ): Promise<CustomerFeedback> {
    const customer = await this.findOne(customerId, organizationIds);

    const feedback = this.feedbackRepo.create({
      customerId: customer.id,
      orderId: dto.orderId || null,
      rating: dto.rating,
      comment: dto.comment,
      status: 'OPEN',
    });

    return this.feedbackRepo.save(feedback);
  }

  async getCustomerFeedbacks(
    customerId: string,
    organizationIds: string[],
  ): Promise<CustomerFeedback[]> {
    const customer = await this.findOne(customerId, organizationIds);

    return this.feedbackRepo.find({
      where: { customerId: customer.id },
      order: { createdAt: 'DESC' },
      relations: ['order'],
    });
  }

  async updateFeedback(
    id: string,
    dto: UpdateCustomerFeedbackDto,
    organizationIds: string[],
  ): Promise<CustomerFeedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }

    if (!organizationIds.includes(feedback.customer.organizationId)) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }

    if (dto.status !== undefined) {
      feedback.status = dto.status;
    }

    return this.feedbackRepo.save(feedback);
  }

  async updateLoyaltyPoints(
    customerId: string,
    billAmount: number,
  ): Promise<LoyaltyAccount> {
    let loyaltyAccount = await this.loyaltyRepo.findOne({
      where: { customerId },
    });

    if (!loyaltyAccount) {
      const customer = await this.customerRepo.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      loyaltyAccount = this.loyaltyRepo.create({
        customerId,
        points: 0,
        tier: 'SILVER',
      });
    }

    // Earn points: 1 point per ₹100 spent
    const earnedPoints = Math.floor(billAmount / 100);
    loyaltyAccount.points += earnedPoints;

    // Update tier based on points
    if (loyaltyAccount.points >= 1000) {
      loyaltyAccount.tier = 'PLATINUM';
    } else if (loyaltyAccount.points >= 500) {
      loyaltyAccount.tier = 'GOLD';
    } else {
      loyaltyAccount.tier = 'SILVER';
    }

    return this.loyaltyRepo.save(loyaltyAccount);
  }

  async getDashboardStats(organizationIds: string[]): Promise<{
    totalCustomers: number;
    newCustomersLast7Days: number;
    repeatRate: number;
    avgVisitsPerCustomer: number;
  }> {
    const totalCustomers = await this.customerRepo.count({
      where: { organizationId: In(organizationIds) },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newCustomersLast7Days = await this.customerRepo.count({
      where: {
        organizationId: In(organizationIds),
        createdAt: MoreThanOrEqual(sevenDaysAgo),
      },
    });

    const customersWithVisits = await this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.organizationId IN (:...organizationIds)', {
        organizationIds,
      })
      .andWhere('customer.totalVisits > 0')
      .getCount();

    const repeatRate =
      totalCustomers > 0 ? (customersWithVisits / totalCustomers) * 100 : 0;

    const totalVisits = await this.customerRepo
      .createQueryBuilder('customer')
      .select('SUM(customer.totalVisits)', 'total')
      .where('customer.organizationId IN (:...organizationIds)', {
        organizationIds,
      })
      .getRawOne<{ total: string }>();

    const avgVisitsPerCustomer =
      totalCustomers > 0
        ? Number(totalVisits?.total || 0) / totalCustomers
        : 0;

    return {
      totalCustomers,
      newCustomersLast7Days,
      repeatRate: Number(repeatRate.toFixed(2)),
      avgVisitsPerCustomer: Number(avgVisitsPerCustomer.toFixed(2)),
    };
  }
}

