import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { type Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';
import { UpdateInventorySettingsDto } from './dto/update-inventory-settings.dto';
import { UpdateTableSettingsDto } from './dto/update-table-settings.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageService } from '../products/storage.service';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly storageService: StorageService,
  ) {}

  private getFirstOrganizationId(user: SanitizedUser): string {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations[0].id;
  }

  @Get()
  getSettings(@Req() req: RequestWithUser) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.settingsService.getSettings(organizationId);
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
    @Req() req: RequestWithUser,
    @Body() dto: UpdateBusinessSettingsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const organizationId = this.getFirstOrganizationId(req.user);
    if (file) {
      dto.businessLogo = this.storageService.getImageUrl(file.filename, 'business');
    }
    return this.settingsService.updateBusinessSettings(dto, organizationId);
  }

  @Patch('billing')
  updateBillingSettings(@Req() req: RequestWithUser, @Body() dto: UpdateBillingSettingsDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.settingsService.updateBillingSettings(dto, organizationId);
  }

  @Patch('inventory')
  updateInventorySettings(@Req() req: RequestWithUser, @Body() dto: UpdateInventorySettingsDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.settingsService.updateInventorySettings(dto, organizationId);
  }

  @Patch('tables')
  updateTableSettings(@Req() req: RequestWithUser, @Body() dto: UpdateTableSettingsDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.settingsService.updateTableSettings(dto, organizationId);
  }

  @Patch('organization')
  updateOrganizationSettings(@Req() req: RequestWithUser, @Body() dto: UpdateOrganizationSettingsDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.settingsService.updateOrganizationSettings(dto, organizationId);
  }
}

