import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';
import { UpdateInventorySettingsDto } from './dto/update-inventory-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageService } from '../products/storage.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('business')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: new StorageService().getStorageConfig('business'),
      fileFilter: (req, file, cb) => {
        if (!file) {
          cb(null, true);
          return;
        }
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  updateBusinessSettings(
    @Body() dto: UpdateBusinessSettingsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.businessLogo = this.storageService.getImageUrl(file.filename, 'business');
    }
    return this.settingsService.updateBusinessSettings(dto);
  }

  @Patch('billing')
  updateBillingSettings(@Body() dto: UpdateBillingSettingsDto) {
    return this.settingsService.updateBillingSettings(dto);
  }

  @Patch('inventory')
  updateInventorySettings(@Body() dto: UpdateInventorySettingsDto) {
    return this.settingsService.updateInventorySettings(dto);
  }
}

