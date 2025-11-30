import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(OrganizationInvite)
    private readonly invitesRepository: Repository<OrganizationInvite>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Create and send an invite to an email address
   */
  async createInvite(
    organizationId: string,
    createDto: CreateInviteDto,
    inviterId: string,
    inviterRole: string,
  ): Promise<OrganizationInvite> {
    // Only admins can send invites
    if (inviterRole !== 'admin') {
      throw new ForbiddenException('Only admins can send invites');
    }

    // Check organization exists
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      relations: ['users'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already a member
    const existingUser = await this.usersRepository.findOne({
      where: { email: createDto.email },
    });
    if (existingUser) {
      const isAlreadyMember = organization.users.some(u => u.id === existingUser.id);
      if (isAlreadyMember) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await this.invitesRepository.findOne({
      where: {
        organizationId,
        email: createDto.email,
        status: 'pending',
      },
    });
    if (existingInvite) {
      throw new ConflictException('There is already a pending invite for this email');
    }

    // Create invite with 7 day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = this.invitesRepository.create({
      organizationId,
      email: createDto.email,
      invitedBy: inviterId,
      token: randomUUID(),
      expiresAt,
      status: 'pending',
    });

    const saved = await this.invitesRepository.save(invite);

    // TODO: Send email notification here (for now just return the invite)
    // In production, integrate with an email service like SendGrid, Mailgun, etc.

    return await this.invitesRepository.findOne({
      where: { id: saved.id },
      relations: ['organization', 'inviter'],
    }) || saved;
  }

  /**
   * Get all pending invites for the current user's email
   */
  async getMyInvites(userEmail: string): Promise<OrganizationInvite[]> {
    return await this.invitesRepository.find({
      where: {
        email: userEmail,
        status: 'pending',
      },
      relations: ['organization', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all invites for an organization (admin only)
   */
  async getOrganizationInvites(
    organizationId: string,
    userId: string,
    userRole: string,
  ): Promise<OrganizationInvite[]> {
    // Only admins can view organization invites
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can view organization invites');
    }

    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return await this.invitesRepository.find({
      where: { organizationId },
      relations: ['inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Accept or decline an invite by ID (for logged-in users)
   */
  async respondToInvite(
    inviteId: string,
    action: 'accept' | 'decline',
    userId: string,
    userEmail: string,
  ): Promise<OrganizationInvite> {
    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId },
      relations: ['organization'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Check if invite is for this user
    if (invite.email !== userEmail) {
      throw new ForbiddenException('This invite is not for you');
    }

    return this.processInviteResponse(invite, action, userId);
  }

  /**
   * Accept or decline an invite by token (for email links)
   */
  async respondToInviteByToken(
    token: string,
    action: 'accept' | 'decline',
    userId: string,
    userEmail: string,
  ): Promise<OrganizationInvite> {
    const invite = await this.invitesRepository.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or invalid token');
    }

    // Check if invite is for this user
    if (invite.email !== userEmail) {
      throw new ForbiddenException('This invite is not for you');
    }

    return this.processInviteResponse(invite, action, userId);
  }

  /**
   * Process the invite response (accept/decline)
   */
  private async processInviteResponse(
    invite: OrganizationInvite,
    action: 'accept' | 'decline',
    userId: string,
  ): Promise<OrganizationInvite> {
    if (invite.status !== 'pending') {
      throw new BadRequestException(`Invite has already been ${invite.status}`);
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite has expired');
    }

    if (action === 'accept') {
      // Add user to organization
      const organization = await this.organizationsRepository.findOne({
        where: { id: invite.organizationId },
        relations: ['users'],
      });

      if (!organization) {
        throw new NotFoundException('Organization no longer exists');
      }

      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Add user to organization
      organization.users.push(user);
      await this.organizationsRepository.save(organization);

      invite.status = 'accepted';
    } else {
      invite.status = 'declined';
    }

    return await this.invitesRepository.save(invite);
  }

  /**
   * Cancel an invite (admin only)
   */
  async cancelInvite(
    inviteId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    // Only admins can cancel invites
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can cancel invites');
    }

    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel an invite that is already ${invite.status}`);
    }

    invite.status = 'cancelled';
    await this.invitesRepository.save(invite);
  }

  /**
   * Resend an invite (admin only)
   */
  async resendInvite(
    inviteId: string,
    userId: string,
    userRole: string,
  ): Promise<OrganizationInvite> {
    // Only admins can resend invites
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can resend invites');
    }

    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId },
      relations: ['organization'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException(`Cannot resend an invite that is ${invite.status}`);
    }

    // Extend expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    invite.expiresAt = expiresAt;

    // Generate new token
    invite.token = randomUUID();

    const saved = await this.invitesRepository.save(invite);

    // TODO: Resend email notification here

    return saved;
  }
}

