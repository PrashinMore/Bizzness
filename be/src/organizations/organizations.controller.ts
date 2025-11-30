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
} from '@nestjs/common';
import { type Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  findAll(@Req() req: RequestWithUser): Promise<Organization[]> {
    return this.organizationsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<Organization> {
    return this.organizationsService.findOne(id, req.user.id, req.user.role);
  }

  @Roles('admin')
  @Post()
  create(
    @Body() createDto: CreateOrganizationDto,
    @Req() req: RequestWithUser,
  ): Promise<Organization> {
    return this.organizationsService.create(createDto, req.user.id);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @Req() req: RequestWithUser,
  ): Promise<Organization> {
    return this.organizationsService.update(id, updateDto, req.user.id, req.user.role);
  }

  @Roles('admin')
  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.organizationsService.remove(id, req.user.id, req.user.role);
  }

  /**
   * Remove a user from an organization (admin only)
   * Note: Users are added via invites, not direct assignment
   */
  @Roles('admin')
  @Delete(':id/users/:userId')
  removeUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() req: RequestWithUser,
  ): Promise<Organization> {
    return this.organizationsService.removeUser(id, userId, req.user.role);
  }
}

