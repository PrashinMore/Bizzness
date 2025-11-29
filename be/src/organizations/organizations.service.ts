import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createDto: CreateOrganizationDto, creatorId: string): Promise<Organization> {
    // Check if organization with same name already exists
    const existing = await this.organizationsRepository.findOne({
      where: { name: createDto.name },
    });
    if (existing) {
      throw new ConflictException('Organization with this name already exists');
    }

    // Get the creator user
    const creator = await this.usersRepository.findOne({
      where: { id: creatorId },
    });
    if (!creator) {
      throw new NotFoundException('Creator user not found');
    }

    const organization = this.organizationsRepository.create({
      name: createDto.name,
      description: createDto.description ?? null,
      createdBy: creatorId,
      creator: creator,
      users: [creator], // Automatically associate the creator
    });

    const saved = await this.organizationsRepository.save(organization);
    
    // Reload with users relation to return complete data
    return await this.organizationsRepository.findOne({
      where: { id: saved.id },
      relations: ['users'],
    }) || saved;
  }

  async findAll(userId: string, userRole: string): Promise<Organization[]> {
    // All users (including admins) only see organizations they created or are a member of
    return await this.organizationsRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.users', 'users')
      .leftJoinAndSelect('organization.creator', 'creator')
      .where('users.id = :userId OR organization.createdBy = :userId', { userId })
      .orderBy('organization.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, userId: string, userRole: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['users', 'creator'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // All users can only see organizations they created or are a member of
    const isMember = organization.users.some(u => u.id === userId);
    const isCreator = organization.createdBy === userId;
    if (!isMember && !isCreator) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return organization;
  }

  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
    userId: string,
    userRole: string,
  ): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['users', 'creator'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Only admins can edit organizations
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can edit organizations');
    }

    // Check if name is being updated and if it conflicts with existing organization
    if (updateDto.name && updateDto.name !== organization.name) {
      const existing = await this.organizationsRepository.findOne({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException('Organization with this name already exists');
      }
    }

    if (updateDto.name !== undefined) {
      organization.name = updateDto.name;
    }
    if (updateDto.description !== undefined) {
      organization.description = updateDto.description;
    }

    return await this.organizationsRepository.save(organization);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['users', 'creator'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Only admins can delete organizations
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can delete organizations');
    }

    // Many-to-many relationship will automatically remove join table entries
    await this.organizationsRepository.remove(organization);
  }

  async assignUser(organizationId: string, userId: string, requesterRole: string): Promise<Organization> {
    // Only admins can assign users
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Only admins can assign users to organizations');
    }
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      relations: ['users'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already assigned
    const isAlreadyAssigned = organization.users.some(u => u.id === userId);
    if (isAlreadyAssigned) {
      throw new ConflictException('User is already assigned to this organization');
    }

    organization.users.push(user);
    return await this.organizationsRepository.save(organization);
  }

  async removeUser(organizationId: string, userId: string, requesterRole: string): Promise<Organization> {
    // Only admins can remove users
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Only admins can remove users from organizations');
    }
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      relations: ['users'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const userIndex = organization.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new NotFoundException('User is not assigned to this organization');
    }

    organization.users.splice(userIndex, 1);
    return await this.organizationsRepository.save(organization);
  }
}

