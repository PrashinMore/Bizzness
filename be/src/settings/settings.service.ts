import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';
import { UpdateInventorySettingsDto } from './dto/update-inventory-settings.dto';
import { UpdateTableSettingsDto } from './dto/update-table-settings.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  async getSettings(organizationId: string): Promise<Settings> {
    let settings = await this.settingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings if none exist for this organization
      settings = this.settingsRepository.create({ organizationId });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async updateBusinessSettings(
    dto: UpdateBusinessSettingsDto,
    organizationId: string,
  ): Promise<Settings> {
    const settings = await this.getSettings(organizationId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async updateBillingSettings(
    dto: UpdateBillingSettingsDto,
    organizationId: string,
  ): Promise<Settings> {
    const settings = await this.getSettings(organizationId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async updateInventorySettings(
    dto: UpdateInventorySettingsDto,
    organizationId: string,
  ): Promise<Settings> {
    const settings = await this.getSettings(organizationId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async updateTableSettings(
    dto: UpdateTableSettingsDto,
    organizationId: string,
  ): Promise<Settings> {
    const settings = await this.getSettings(organizationId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async updateOrganizationSettings(
    dto: UpdateOrganizationSettingsDto,
    organizationId: string,
  ): Promise<Settings> {
    const settings = await this.getSettings(organizationId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }
}

