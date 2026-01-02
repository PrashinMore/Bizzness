import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class TransformMultipartPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const transformed = { ...value };

    // Transform numeric fields from strings to numbers
    if (transformed.costPrice !== undefined && transformed.costPrice !== null && transformed.costPrice !== '') {
      const numValue = typeof transformed.costPrice === 'string' 
        ? parseFloat(transformed.costPrice) 
        : Number(transformed.costPrice);
      if (isNaN(numValue)) {
        throw new BadRequestException('costPrice must be a valid number');
      }
      transformed.costPrice = numValue;
    }
    if (transformed.sellingPrice !== undefined && transformed.sellingPrice !== null && transformed.sellingPrice !== '') {
      const numValue = typeof transformed.sellingPrice === 'string' 
        ? parseFloat(transformed.sellingPrice) 
        : Number(transformed.sellingPrice);
      if (isNaN(numValue)) {
        throw new BadRequestException('sellingPrice must be a valid number');
      }
      transformed.sellingPrice = numValue;
    }
    if (transformed.lowStockThreshold !== undefined && transformed.lowStockThreshold !== null && transformed.lowStockThreshold !== '') {
      const numValue = typeof transformed.lowStockThreshold === 'string' 
        ? parseInt(transformed.lowStockThreshold, 10) 
        : Number(transformed.lowStockThreshold);
      if (isNaN(numValue) || !Number.isInteger(numValue)) {
        throw new BadRequestException('lowStockThreshold must be a valid integer');
      }
      transformed.lowStockThreshold = numValue;
    }

    return transformed;
  }
}

