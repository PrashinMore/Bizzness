import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { type Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StorageService } from './storage.service';
import { TransformMultipartPipe } from './pipes/transform-multipart.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
  ) {}

  private getOrganizationIds(user: SanitizedUser): string[] {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations.map(org => org.id);
  }

  private getFirstOrganizationId(user: SanitizedUser): string {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    return user.organizations[0].id;
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
    @Query('forMenu') forMenu?: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.productsService.findAll({
      search,
      category,
      lowStockOnly: lowStock === 'true',
      organizationIds,
      excludeRawMaterials: forMenu === 'true',
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', {
    storage: new StorageService().getStorageConfig(),
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
  }))
  @UsePipes(
    TransformMultipartPipe,
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  )
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const organizationId = this.getFirstOrganizationId(req.user);
    const imageUrl = file
      ? this.storageService.getImageUrl(file.filename)
      : null;
    return this.productsService.create({ ...dto, imageUrl, organizationId });
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', {
    storage: new StorageService().getStorageConfig(),
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
  }))
  @UsePipes(
    TransformMultipartPipe,
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  )
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    const updateData: UpdateProductDto = { ...dto };
    if (file) {
      updateData.imageUrl = this.storageService.getImageUrl(file.filename);
    }
    return this.productsService.update(id, updateData, organizationIds);
  }

  @Patch(':id/stock')
  adjustStock(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.productsService.adjustStock(id, dto.delta, organizationIds);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.productsService.remove(id, organizationIds);
  }
}

