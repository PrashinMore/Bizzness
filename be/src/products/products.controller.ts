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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StorageService } from './storage.service';
import { TransformMultipartPipe } from './pipes/transform-multipart.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OutletsService } from '../outlets/outlets.service';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
    private readonly outletsService: OutletsService,
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
    @Query('forMenu') forMenu?: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.productsService.findAll({
      search,
      category,
      organizationIds,
      excludeRawMaterials: forMenu === 'true',
    });
  }

  @Get('suggestions')
  getSuggestions(
    @Req() req: RequestWithUser,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    const organizationIds = this.getOrganizationIds(req.user);
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const validLimit = isNaN(limitNum) || limitNum < 1 || limitNum > 50 ? 10 : limitNum;
    return this.productsService.getSuggestions(query || '', organizationIds, validLimit);
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @Req() req: RequestWithUser,
    @Query('name') name?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    if (!name || !name.trim()) {
      return { isDuplicate: false };
    }

    const organizationIds = this.getOrganizationIds(req.user);
    const result = await this.productsService.checkDuplicate(
      name.trim(),
      organizationIds,
      excludeId,
    );

    if (result.isDuplicate && result.similarProduct) {
      return {
        isDuplicate: true,
        message: 'A product with a similar name may already exist',
        similarProduct: {
          id: result.similarProduct.id,
          name: result.similarProduct.name,
        },
      };
    }

    return { isDuplicate: false };
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
    // Use outletId from header, or fall back to body
    let outletId = (req.headers['x-outlet-id'] as string) || dto.outletId || undefined;
    
    // If no outletId provided and stock is being set, try to use the only outlet
    if (!outletId && dto.stock !== undefined && dto.stock !== null) {
      const outlets = await this.outletsService.getOrganizationOutlets(organizationId);
      if (outlets.length === 1) {
        outletId = outlets[0].id;
      }
    }
    
    const imageUrl = file
      ? this.storageService.getImageUrl(file.filename)
      : null;
    return this.productsService.create({ ...dto, imageUrl, organizationId, outletId });
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

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const organizationIds = this.getOrganizationIds(req.user);
    return this.productsService.remove(id, organizationIds);
  }

  @Roles('admin')
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const csvContent = await this.productsService.generateCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
    res.send(csvContent);
  }

  @Roles('admin')
  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'), false);
      }
    },
  }))
  async bulkImport(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new ForbiddenException('CSV file is required');
    }

    const organizationId = this.getFirstOrganizationId(req.user);
    const organizationIds = this.getOrganizationIds(req.user);

    const result = await this.productsService.bulkImportFromCsv(
      file,
      organizationId,
      organizationIds,
    );

    return {
      success: true,
      message: `Import completed: ${result.created} created, ${result.updated} updated`,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      totalProcessed: result.created + result.updated + result.errors.length,
    };
  }
}

