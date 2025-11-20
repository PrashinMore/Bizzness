import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly productsUploadPath = join(process.cwd(), 'uploads', 'products');
  private readonly businessUploadPath = join(process.cwd(), 'uploads', 'business');

  constructor() {
    // Ensure upload directories exist
    if (!existsSync(this.productsUploadPath)) {
      mkdirSync(this.productsUploadPath, { recursive: true });
    }
    if (!existsSync(this.businessUploadPath)) {
      mkdirSync(this.businessUploadPath, { recursive: true });
    }
  }

  getStorageConfig(directory: 'products' | 'business' = 'products') {
    const uploadPath = directory === 'products' ? this.productsUploadPath : this.businessUploadPath;
    return diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // Generate unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        cb(null, filename);
      },
    });
  }

  getImageUrl(filename: string, directory: 'products' | 'business' = 'products'): string {
    return `/uploads/${directory}/${filename}`;
  }

  getUploadPath(directory: 'products' | 'business' = 'products'): string {
    return directory === 'products' ? this.productsUploadPath : this.businessUploadPath;
  }
}

