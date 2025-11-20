import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly productsUploadPath: string;
  private readonly businessUploadPath: string;

  constructor() {
    // Detect serverless environment (AWS Lambda, Vercel, etc.)
    const isServerless = 
      !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
      !!process.env.VERCEL ||
      !!process.env.IS_SERVERLESS ||
      process.cwd().startsWith('/var/task'); // AWS Lambda indicator

    // Use /tmp for serverless environments (only writable location)
    const baseUploadPath = isServerless ? '/tmp' : process.cwd();
    
    this.productsUploadPath = join(baseUploadPath, 'uploads', 'products');
    this.businessUploadPath = join(baseUploadPath, 'uploads', 'business');

    // Ensure upload directories exist with proper error handling
    try {
      if (!existsSync(this.productsUploadPath)) {
        mkdirSync(this.productsUploadPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create products upload directory:', error);
      // Fallback to /tmp if initial path fails
      if (!isServerless) {
        const fallbackPath = join('/tmp', 'uploads', 'products');
        try {
          mkdirSync(fallbackPath, { recursive: true });
          (this as any).productsUploadPath = fallbackPath;
        } catch (fallbackError) {
          console.error('Failed to create fallback upload directory:', fallbackError);
        }
      }
    }

    try {
      if (!existsSync(this.businessUploadPath)) {
        mkdirSync(this.businessUploadPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create business upload directory:', error);
      // Fallback to /tmp if initial path fails
      if (!isServerless) {
        const fallbackPath = join('/tmp', 'uploads', 'business');
        try {
          mkdirSync(fallbackPath, { recursive: true });
          (this as any).businessUploadPath = fallbackPath;
        } catch (fallbackError) {
          console.error('Failed to create fallback upload directory:', fallbackError);
        }
      }
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

