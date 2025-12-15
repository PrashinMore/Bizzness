import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { type Request } from 'express';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { AssignTableDto } from './dto/assign-table.dto';
import { SwitchTableDto } from './dto/switch-table.dto';
import { MergeTablesDto } from './dto/merge-tables.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

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

  @Post()
  create(@Req() req: RequestWithUser, @Body() createTableDto: CreateTableDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.tablesService.create(createTableDto, organizationId);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.findAll(organizationIds);
  }

  @Get(':id')
  findOne(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.getTableWithOrders(id, organizationIds);
  }

  @Get(':id/active-sale')
  getActiveSale(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.getActiveSaleForTable(id, organizationIds);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.update(id, updateTableDto, organizationIds);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateTableStatusDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.updateStatus(id, updateStatusDto, organizationIds);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.remove(id, organizationIds);
  }

  @Post('sales/:saleId/assign')
  assignTableToSale(
    @Req() req: RequestWithUser,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() assignTableDto: AssignTableDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.assignTableToSale(saleId, assignTableDto.tableId, organizationIds);
  }

  @Post('sales/:saleId/switch')
  switchTable(
    @Req() req: RequestWithUser,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() switchTableDto: SwitchTableDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.switchTable(saleId, switchTableDto.toTableId, organizationIds);
  }

  @Post('merge')
  mergeTables(@Req() req: RequestWithUser, @Body() mergeTablesDto: MergeTablesDto) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.tablesService.mergeTables(
      mergeTablesDto.sourceTableIds,
      mergeTablesDto.targetTableId,
      organizationIds,
    );
  }
}
