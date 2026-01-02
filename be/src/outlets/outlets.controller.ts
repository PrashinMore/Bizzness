import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OutletsService } from './outlets.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { Outlet } from './entities/outlet.entity';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('outlets')
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

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

  @Get()
  findAll(@Req() req: RequestWithUser): Promise<Outlet[]> {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.outletsService.findAll(organizationIds);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<Outlet> {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.outletsService.findOne(id, organizationIds);
  }

  @Post()
  create(
    @Body() createDto: CreateOutletDto,
    @Req() req: RequestWithUser,
  ): Promise<Outlet> {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.outletsService.create(createDto, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateOutletDto,
    @Req() req: RequestWithUser,
  ): Promise<Outlet> {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.outletsService.update(id, updateDto, organizationIds);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.outletsService.remove(id, organizationIds);
  }
}

