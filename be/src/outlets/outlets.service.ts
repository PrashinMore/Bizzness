import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Outlet } from './entities/outlet.entity';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import type { SanitizedUser } from '../users/users.types';

@Injectable()
export class OutletsService {
  constructor(
    @InjectRepository(Outlet)
    private readonly outletsRepository: Repository<Outlet>,
  ) {}

  async findAll(organizationIds: string[]): Promise<Outlet[]> {
    if (!organizationIds || organizationIds.length === 0) {
      return [];
    }
    return this.outletsRepository.find({
      where: organizationIds.map((id) => ({ organizationId: id })),
      order: { isPrimary: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: string, organizationIds: string[]): Promise<Outlet> {
    const outlet = await this.outletsRepository.findOne({
      where: { id },
    });

    if (!outlet) {
      throw new NotFoundException(`Outlet ${id} not found`);
    }

    if (!organizationIds.includes(outlet.organizationId)) {
      throw new ForbiddenException('You do not have access to this outlet');
    }

    return outlet;
  }

  async create(
    createDto: CreateOutletDto,
    organizationId: string,
  ): Promise<Outlet> {
    // If this is the first outlet or isPrimary is true, unset other primary outlets
    if (createDto.isPrimary) {
      await this.outletsRepository.update(
        { organizationId, isPrimary: true },
        { isPrimary: false },
      );
    } else {
      // Check if this will be the first outlet
      const existingCount = await this.outletsRepository.count({
        where: { organizationId },
      });
      if (existingCount === 0) {
        createDto.isPrimary = true;
      }
    }

    const outlet = this.outletsRepository.create({
      ...createDto,
      organizationId,
      isActive: true,
    });

    return this.outletsRepository.save(outlet);
  }

  async update(
    id: string,
    updateDto: UpdateOutletDto,
    organizationIds: string[],
  ): Promise<Outlet> {
    const outlet = await this.findOne(id, organizationIds);

    // If setting as primary, unset other primary outlets in the same organization
    if (updateDto.isPrimary === true) {
      await this.outletsRepository
        .createQueryBuilder()
        .update(Outlet)
        .set({ isPrimary: false })
        .where('organizationId = :orgId', { orgId: outlet.organizationId })
        .andWhere('id != :id', { id })
        .andWhere('isPrimary = :isPrimary', { isPrimary: true })
        .execute();
    }

    Object.assign(outlet, updateDto);
    return this.outletsRepository.save(outlet);
  }

  async remove(id: string, organizationIds: string[]): Promise<void> {
    const outlet = await this.findOne(id, organizationIds);

    // Check if this is the last outlet
    const count = await this.outletsRepository.count({
      where: { organizationId: outlet.organizationId },
    });

    if (count === 1) {
      throw new ConflictException('Cannot delete the last outlet in an organization');
    }

    // If it's primary, make another outlet primary
    if (outlet.isPrimary) {
      const otherOutlet = await this.outletsRepository
        .createQueryBuilder('outlet')
        .where('outlet.organizationId = :orgId', { orgId: outlet.organizationId })
        .andWhere('outlet.id != :id', { id })
        .andWhere('outlet.isActive = :isActive', { isActive: true })
        .getOne();
      if (otherOutlet) {
        otherOutlet.isPrimary = true;
        await this.outletsRepository.save(otherOutlet);
      }
    }

    // Soft delete by setting isActive to false
    outlet.isActive = false;
    await this.outletsRepository.save(outlet);
  }

  async getOrganizationOutlets(organizationId: string): Promise<Outlet[]> {
    return this.outletsRepository.find({
      where: { organizationId, isActive: true },
      order: { isPrimary: 'DESC', name: 'ASC' },
    });
  }
}

