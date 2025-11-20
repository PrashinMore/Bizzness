import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly uploadPath = join(process.cwd(), 'uploads', 'products');

  constructor() {
    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  getStorageConfig() {
    return diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadPath);
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

  getImageUrl(filename: string): string {
    return `/uploads/products/${filename}`;
  }

  getUploadPath(): string {
    return this.uploadPath;
  }
}

