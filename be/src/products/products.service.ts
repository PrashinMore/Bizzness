import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository, DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { GlobalProduct } from './entities/global-product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from '../categories/entities/category.entity';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'stream';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1,  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1, where 1 is identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  // Exact match
  if (normalized1 === normalized2) {
    return 1.0;
  }

  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const similarity = 1 - distance / maxLength;

  return similarity;
}

interface ListOptions {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
  organizationIds?: string[];
  excludeRawMaterials?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(GlobalProduct)
    private readonly globalProductRepo: Repository<GlobalProduct>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateProductDto & { organizationId: string }) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async findAll(options: ListOptions = {}) {
    const qb = this.productRepo.createQueryBuilder('product');

    if (options.organizationIds && options.organizationIds.length > 0) {
      qb.andWhere('product.organizationId IN (:...organizationIds)', {
        organizationIds: options.organizationIds,
      });
    } else if (options.organizationIds && options.organizationIds.length === 0) {
      // User has no organizations, return empty
      qb.andWhere('1 = 0');
    }

    if (options.category) {
      qb.andWhere('product.category ILIKE :category', {
        category: `%${options.category}%`,
      });
    }

    if (options.search) {
      qb.andWhere('product.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    if (options.lowStockOnly) {
      qb.andWhere('product.stock < product.lowStockThreshold');
    }

    // Exclude raw material categories if requested (for menu/checkout)
    if (options.excludeRawMaterials) {
      // Use a subquery to exclude products where category matches any raw material category name
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM categories cat 
          WHERE cat."isRawMaterial" = true 
          AND LOWER(cat.name) = LOWER(product.category)
        )`,
      );
    }

    qb.orderBy('product.updatedAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string, organizationIds?: string[]) {
    const where: any = { id };
    if (organizationIds && organizationIds.length > 0) {
      where.organizationId = In(organizationIds);
    }
    const product = await this.productRepo.findOne({ where });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    // Double check organization access
    if (organizationIds && organizationIds.length > 0 && !organizationIds.includes(product.organizationId)) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, organizationIds?: string[]) {
    const product = await this.findOne(id, organizationIds);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async adjustStock(id: string, delta: number, organizationIds?: string[]) {
    const product = await this.findOne(id, organizationIds);
    const newStock = product.stock + delta;
    product.stock = Math.max(newStock, 0);
    return this.productRepo.save(product);
  }

  async remove(id: string, organizationIds?: string[]) {
    const product = await this.findOne(id, organizationIds);
    await this.productRepo.remove(product);
  }

  async getSuggestions(
    query: string,
    organizationIds?: string[],
    limit: number = 10,
  ): Promise<Array<{ name: string; type: 'existing' | 'global'; score: number; category?: string }>> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const escapedQuery = query.trim();
    const results: Array<{ name: string; type: 'existing' | 'global'; score: number; category?: string }> = [];

    // 1. Query existing products from user's organizations using pg_trgm
    if (organizationIds && organizationIds.length > 0) {
      try {
        // First check if pg_trgm extension is enabled
        const extensionCheck = await this.dataSource.query(
          `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') as enabled`,
        );
        
        if (!extensionCheck[0]?.enabled) {
          throw new Error('pg_trgm extension is not enabled. Please run the migration SQL file.');
        }

        // Get the actual table name from TypeORM metadata
        const productTableName = this.productRepo.metadata.tableName;
        const existingProducts = await this.dataSource.query(
          `
          SELECT 
            name,
            'existing' AS type,
            similarity(name, $2) AS score,
            category
          FROM ${productTableName}
          WHERE "organizationId" = ANY($1::uuid[])
            AND name % $2
          ORDER BY score DESC, name ASC
          LIMIT $3
          `,
          [organizationIds, escapedQuery, limit],
        );

        results.push(...existingProducts);
      } catch (err) {
        // If pg_trgm is not enabled, fall back to ILIKE
        console.warn('pg_trgm not available, falling back to ILIKE search:', err);
        const qb = this.productRepo.createQueryBuilder('product')
          .select('product.name', 'name')
          .addSelect('product.category', 'category')
          .where('product.name ILIKE :query', { query: `%${escapedQuery}%` })
          .andWhere('product.organizationId IN (:...organizationIds)', {
            organizationIds: organizationIds,
          })
          .groupBy('product.name')
          .addGroupBy('product.category')
          .orderBy('product.name', 'ASC')
          .limit(limit);

        const fallbackResults = await qb.getRawMany<{ name: string; category: string }>();
        results.push(
          ...fallbackResults.map((r) => ({
            name: r.name,
            type: 'existing' as const,
            score: 0.5, // Default score for fallback
            category: r.category,
          })),
        );
      }
    }

    // 2. Query global products catalog using pg_trgm
    try {
      // Check if pg_trgm extension is enabled
      const extensionCheck = await this.dataSource.query(
        `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') as enabled`,
      );
      
      if (!extensionCheck[0]?.enabled) {
        throw new Error('pg_trgm extension is not enabled. Please run the migration SQL file.');
      }

      const globalProducts = await this.dataSource.query(
        `
        SELECT 
          name,
          'global' AS type,
          similarity(name, $1) AS score,
          category
        FROM global_products
        WHERE name % $1
        ORDER BY score DESC, name ASC
        LIMIT $2
        `,
        [escapedQuery, limit],
      );

      results.push(...globalProducts);
    } catch (err) {
      // If pg_trgm is not enabled, fall back to ILIKE
      console.warn('pg_trgm not available for global products, falling back to ILIKE search:', err);
      const qb = this.globalProductRepo.createQueryBuilder('gp')
        .select('gp.name', 'name')
        .addSelect('gp.category', 'category')
        .where('gp.name ILIKE :query', { query: `%${escapedQuery}%` })
        .orderBy('gp.name', 'ASC')
        .limit(limit);

      const fallbackResults = await qb.getRawMany<{ name: string; category: string }>();
      results.push(
        ...fallbackResults.map((r) => ({
          name: r.name,
          type: 'global' as const,
          score: 0.5, // Default score for fallback
          category: r.category,
        })),
      );
    }

    // 3. Merge and deduplicate by name (keep highest score)
    const uniqueMap = new Map<string, { name: string; type: 'existing' | 'global'; score: number; category?: string }>();
    results.forEach((item) => {
      const existing = uniqueMap.get(item.name.toLowerCase());
      if (!existing || item.score > existing.score) {
        uniqueMap.set(item.name.toLowerCase(), item);
      }
    });

    // 4. Sort by score (descending) and return
    return Array.from(uniqueMap.values())
      .sort((a, b) => {
        // Weight existing products slightly higher
        const scoreA = a.type === 'existing' ? a.score + 0.1 : a.score;
        const scoreB = b.type === 'existing' ? b.score + 0.1 : b.score;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  async checkDuplicate(
    productName: string,
    organizationIds?: string[],
    excludeProductId?: string,
  ): Promise<{ isDuplicate: boolean; similarProduct?: { id: string; name: string } }> {
    if (!productName || !productName.trim()) {
      return { isDuplicate: false };
    }

    const normalizedInput = productName.trim().toLowerCase();

    // Get all products from user's organizations
    const qb = this.productRepo.createQueryBuilder('product')
      .select(['product.id', 'product.name']);

    if (organizationIds && organizationIds.length > 0) {
      qb.andWhere('product.organizationId IN (:...organizationIds)', {
        organizationIds: organizationIds,
      });
    } else if (organizationIds && organizationIds.length === 0) {
      // User has no organizations, return no duplicate
      return { isDuplicate: false };
    }

    // Exclude current product if updating
    if (excludeProductId) {
      qb.andWhere('product.id != :excludeId', { excludeId: excludeProductId });
    }

    const products = await qb.getMany();

    // Check for exact match (case-insensitive)
    const exactMatch = products.find(
      (p) => p.name.toLowerCase().trim() === normalizedInput,
    );
    if (exactMatch) {
      return {
        isDuplicate: true,
        similarProduct: {
          id: exactMatch.id,
          name: exactMatch.name,
        },
      };
    }

    // Check for similar names using similarity threshold
    // Threshold: 0.85 means 85% similarity (allows for minor typos but distinguishes different products)
    const SIMILARITY_THRESHOLD = 0.85;

    for (const product of products) {
      const similarity = calculateSimilarity(productName, product.name);
      if (similarity >= SIMILARITY_THRESHOLD) {
        return {
          isDuplicate: true,
          similarProduct: {
            id: product.id,
            name: product.name,
          },
        };
      }
    }

    return { isDuplicate: false };
  }

  async generateCsvTemplate(): Promise<string> {
    const rows = [
      { name: 'Example Product', category: 'Beverages', costPrice: '10.50', sellingPrice: '15.99', stock: '100', unit: 'pieces', lowStockThreshold: '10' },
      { name: 'Another Product', category: 'Snacks', costPrice: '5.00', sellingPrice: '8.50', stock: '50', unit: 'pieces', lowStockThreshold: '5' },
    ];

    return stringify(rows, { header: true });
  }

  async bulkImportFromCsv(
    file: Express.Multer.File,
    organizationId: string,
    organizationIds: string[],
  ): Promise<{
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    const rows: any[] = [];
    let rowNumber = 1; // Header is row 1, so data starts at row 2

    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer);
      
      stream
        .pipe(csv())
        .on('data', (row) => {
          rowNumber++;
          rows.push({ ...row, _rowNumber: rowNumber });
        })
        .on('end', async () => {
          try {
            // Process all rows in a transaction
            await this.dataSource.transaction(async (manager) => {
              // Get all existing products for this organization to check for duplicates
              const existingProducts = await manager.getRepository(Product).find({
                where: { organizationId: In(organizationIds) },
              });
              
              const productMap = new Map<string, Product>();
              existingProducts.forEach((p) => {
                productMap.set(p.name.toLowerCase().trim(), p);
              });

              for (const row of rows) {
                const rowNum = row._rowNumber;
                try {
                  // Validate required fields
                  if (!row.name || !row.name.trim()) {
                    results.errors.push({ row: rowNum, error: 'Name is required' });
                    continue;
                  }
                  if (!row.category || !row.category.trim()) {
                    results.errors.push({ row: rowNum, error: 'Category is required' });
                    continue;
                  }
                  if (!row.costPrice || isNaN(parseFloat(row.costPrice))) {
                    results.errors.push({ row: rowNum, error: 'Cost price must be a valid number' });
                    continue;
                  }
                  if (!row.sellingPrice || isNaN(parseFloat(row.sellingPrice))) {
                    results.errors.push({ row: rowNum, error: 'Selling price must be a valid number' });
                    continue;
                  }
                  if (row.stock === undefined || row.stock === '' || isNaN(parseInt(row.stock))) {
                    results.errors.push({ row: rowNum, error: 'Stock must be a valid integer' });
                    continue;
                  }
                  if (!row.unit || !row.unit.trim()) {
                    results.errors.push({ row: rowNum, error: 'Unit is required' });
                    continue;
                  }

                  const productName = row.name.trim();
                  const normalizedName = productName.toLowerCase();
                  const existingProduct = productMap.get(normalizedName);

                  const productData = {
                    name: productName,
                    category: row.category.trim(),
                    costPrice: parseFloat(row.costPrice),
                    sellingPrice: parseFloat(row.sellingPrice),
                    stock: parseInt(row.stock),
                    unit: row.unit.trim(),
                    lowStockThreshold: row.lowStockThreshold
                      ? parseInt(row.lowStockThreshold)
                      : 10,
                    organizationId,
                  };

                  if (existingProduct) {
                    // Update existing product
                    Object.assign(existingProduct, {
                      category: productData.category,
                      costPrice: productData.costPrice,
                      sellingPrice: productData.sellingPrice,
                      stock: productData.stock,
                      unit: productData.unit,
                      lowStockThreshold: productData.lowStockThreshold,
                    });
                    await manager.getRepository(Product).save(existingProduct);
                    results.updated++;
                  } else {
                    // Create new product
                    const newProduct = manager.getRepository(Product).create(productData);
                    await manager.getRepository(Product).save(newProduct);
                    productMap.set(normalizedName, newProduct);
                    results.created++;
                  }
                } catch (err: any) {
                  results.errors.push({
                    row: rowNum,
                    error: err.message || 'Failed to process row',
                  });
                }
              }
            });

            resolve(results);
          } catch (err: any) {
            reject(new BadRequestException(`Failed to import CSV: ${err.message}`));
          }
        })
        .on('error', (err) => {
          reject(new BadRequestException(`Failed to parse CSV: ${err.message}`));
        });
    });
  }
}

