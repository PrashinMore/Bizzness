import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StorageService } from './storage.service';
import { TransformMultipartPipe } from './pipes/transform-multipart.pipe';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.productsService.findAll({
      search,
      category,
      lowStockOnly: lowStock === 'true',
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
    @Body() dto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file
      ? this.storageService.getImageUrl(file.filename)
      : null;
    return this.productsService.create({ ...dto, imageUrl });
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
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updateData: UpdateProductDto = { ...dto };
    if (file) {
      updateData.imageUrl = this.storageService.getImageUrl(file.filename);
    }
    return this.productsService.update(id, updateData);
  }

  @Patch(':id/stock')
  adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.productsService.adjustStock(id, dto.delta);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

