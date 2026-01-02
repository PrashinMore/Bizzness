import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';
import { CrmService } from './crm.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { CreateCustomerFeedbackDto } from './dto/create-customer-feedback.dto';
import { UpdateCustomerFeedbackDto } from './dto/update-customer-feedback.dto';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  private getOrganizationIds(user: SanitizedUser): string[] {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations.map((org) => org.id);
  }

  private getFirstOrganizationId(user: SanitizedUser): string {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations[0].id;
  }

  @Get('dashboard')
  async getDashboard(@Req() req: RequestWithUser) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.getDashboardStats(organizationIds);
  }

  @Get('customers')
  async findAll(@Req() req: RequestWithUser, @Query() query: ListCustomersDto) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.findAll(query, organizationIds);
  }

  @Get('customers/:id')
  async findOne(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.findOne(id, organizationIds);
  }

  @Post('customers')
  async create(@Req() req: RequestWithUser, @Body() dto: CreateCustomerDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.crmService.createCustomer(dto, organizationId);
  }

  @Patch('customers/:id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.update(id, dto, organizationIds);
  }

  @Get('customers/:id/visits')
  async getVisits(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.getCustomerVisits(id, organizationIds);
  }

  @Post('customers/:id/notes')
  async createNote(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateCustomerNoteDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.createNote(id, dto, req.user.id, organizationIds);
  }

  @Get('customers/:id/notes')
  async getNotes(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.getCustomerNotes(id, organizationIds);
  }

  @Post('customers/:id/feedback')
  async createFeedback(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateCustomerFeedbackDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.createFeedback(id, dto, organizationIds);
  }

  @Get('customers/:id/feedback')
  async getFeedbacks(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.getCustomerFeedbacks(id, organizationIds);
  }

  @Patch('feedback/:id')
  async updateFeedback(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCustomerFeedbackDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.crmService.updateFeedback(id, dto, organizationIds);
  }
}

