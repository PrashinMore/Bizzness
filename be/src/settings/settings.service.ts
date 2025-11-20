import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';
import { UpdateInventorySettingsDto } from './dto/update-inventory-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  async getSettings(): Promise<Settings> {
    let settings = await this.settingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      // Create default settings if none exist
      settings = this.settingsRepository.create({});
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async updateBusinessSettings(
    dto: UpdateBusinessSettingsDto,
  ): Promise<Settings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async updateBillingSettings(
    dto: UpdateBillingSettingsDto,
  ): Promise<Settings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async updateInventorySettings(
    dto: UpdateInventorySettingsDto,
  ): Promise<Settings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }
}

