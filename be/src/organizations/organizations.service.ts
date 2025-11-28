import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      users: [creator], // Automatically associate the creator
    });

    const saved = await this.organizationsRepository.save(organization);
    
    // Reload with users relation to return complete data
    return await this.organizationsRepository.findOne({
      where: { id: saved.id },
      relations: ['users'],
    }) || saved;
  }

  async findAll(): Promise<Organization[]> {
    return await this.organizationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
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

  async remove(id: string): Promise<void> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Many-to-many relationship will automatically remove join table entries
    await this.organizationsRepository.remove(organization);
  }

  async assignUser(organizationId: string, userId: string): Promise<Organization> {
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

  async removeUser(organizationId: string, userId: string): Promise<Organization> {
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

