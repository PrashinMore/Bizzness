import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { RespondInviteDto, RespondInviteByTokenDto } from './dto/respond-invite.dto';
import { OrganizationInvite } from './entities/organization-invite.entity';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  /**
   * Get all pending invites for the current user
   * GET /api/invites/my
   */
  @Get('my')
  getMyInvites(@Req() req: RequestWithUser): Promise<OrganizationInvite[]> {
    return this.invitesService.getMyInvites(req.user.email);
  }

  /**
   * Get all invites for an organization (admin only)
   * GET /api/invites/organization/:organizationId
   */
  @Roles('admin')
  @Get('organization/:organizationId')
  getOrganizationInvites(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string,
    @Req() req: RequestWithUser,
  ): Promise<OrganizationInvite[]> {
    return this.invitesService.getOrganizationInvites(
      organizationId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Create an invite for an organization (admin only)
   * POST /api/invites/organization/:organizationId
   */
  @Roles('admin')
  @Post('organization/:organizationId')
  createInvite(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string,
    @Body() createDto: CreateInviteDto,
    @Req() req: RequestWithUser,
  ): Promise<OrganizationInvite> {
    return this.invitesService.createInvite(
      organizationId,
      createDto,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Respond to an invite by ID
   * POST /api/invites/:id/respond
   */
  @Post(':id/respond')
  respondToInvite(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() respondDto: RespondInviteDto,
    @Req() req: RequestWithUser,
  ): Promise<OrganizationInvite> {
    return this.invitesService.respondToInvite(
      id,
      respondDto.action,
      req.user.id,
      req.user.email,
    );
  }

  /**
   * Respond to an invite by token (for email links)
   * POST /api/invites/token/respond
   */
  @Post('token/respond')
  respondToInviteByToken(
    @Body() respondDto: RespondInviteByTokenDto,
    @Req() req: RequestWithUser,
  ): Promise<OrganizationInvite> {
    return this.invitesService.respondToInviteByToken(
      respondDto.token,
      respondDto.action,
      req.user.id,
      req.user.email,
    );
  }

  /**
   * Cancel an invite (admin only)
   * DELETE /api/invites/:id
   */
  @Roles('admin')
  @Delete(':id')
  cancelInvite(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.invitesService.cancelInvite(id, req.user.id, req.user.role);
  }

  /**
   * Resend an invite (admin only)
   * POST /api/invites/:id/resend
   */
  @Roles('admin')
  @Post(':id/resend')
  resendInvite(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<OrganizationInvite> {
    return this.invitesService.resendInvite(id, req.user.id, req.user.role);
  }
}

