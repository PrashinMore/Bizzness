import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { DiningTable, TableStatus } from '../tables/entities/dining-table.entity';
import { SettingsService } from '../settings/settings.service';
import { AddItemsToSaleDto } from './dto/add-items-to-sale.dto';

@Injectable()
export class SalesService {
	constructor(
		@InjectRepository(Sale)
		private readonly saleRepo: Repository<Sale>,
		@InjectRepository(SaleItem)
		private readonly saleItemRepo: Repository<SaleItem>,
		@InjectRepository(DiningTable)
		private readonly tablesRepo: Repository<DiningTable>,
		private readonly dataSource: DataSource,
		@Inject(forwardRef(() => SettingsService))
		private readonly settingsService: SettingsService,
	) {}

	async create(dto: CreateSaleDto & { organizationId: string }, organizationIds: string[]) {
		// Basic consistency checks
		const computedTotal = dto.items.reduce(
			(sum, i) => sum + i.sellingPrice * i.quantity,
			0,
		);
		const round2 = (n: number) => Math.round(n * 100) / 100;
		if (round2(computedTotal) !== round2(dto.totalAmount)) {
			throw new BadRequestException('totalAmount does not match items sum');
		}

		// Handle partial payments
		let cashAmount = dto.cashAmount ?? 0;
		let upiAmount = dto.upiAmount ?? 0;
		
		// Backward compatibility: if paymentType is provided but amounts are not, derive amounts
		if (dto.cashAmount === undefined && dto.upiAmount === undefined && dto.paymentType) {
			if (dto.paymentType === 'UPI') {
				upiAmount = dto.totalAmount;
				cashAmount = 0;
			} else if (dto.paymentType === 'cash') {
				cashAmount = dto.totalAmount;
				upiAmount = 0;
			}
		}
		
		const totalPaid = round2(cashAmount + upiAmount);

		// Validate payment amounts
		if (cashAmount < 0 || upiAmount < 0) {
			throw new BadRequestException('Payment amounts cannot be negative');
		}
		if (totalPaid > round2(dto.totalAmount)) {
			throw new BadRequestException('Total paid amount cannot exceed total amount');
		}

		// Determine payment type and isPaid status
		let paymentType = dto.paymentType || 'cash';
		if (cashAmount > 0 && upiAmount > 0) {
			paymentType = 'mixed';
		} else if (upiAmount > 0) {
			paymentType = 'UPI';
		} else if (cashAmount > 0) {
			paymentType = 'cash';
		}

		const isPaid = round2(totalPaid) === round2(dto.totalAmount);

		return this.dataSource.transaction(async (manager) => {
			const productIds = dto.items.map((i) => i.productId);
			const products = await manager.getRepository(Product).find({
				where: { 
					id: In(productIds),
					organizationId: In(organizationIds),
				},
			});
			const productMap = new Map(products.map((p) => [p.id, p]));

			// Validate availability
			for (const item of dto.items) {
				const product = productMap.get(item.productId);
				if (!product) {
					throw new BadRequestException(`Product ${item.productId} not found`);
				}
				if (product.stock < item.quantity) {
					throw new BadRequestException(
						`Insufficient stock for product ${product.name} (${product.id})`,
					);
				}
			}

			// Decrement stock
			for (const item of dto.items) {
				const product = productMap.get(item.productId)!;
				product.stock = Math.max(product.stock - item.quantity, 0);
				await manager.getRepository(Product).save(product);
			}

			// Handle table assignment
			let table: DiningTable | null = null;
			if (dto.tableId) {
				table = await manager.getRepository(DiningTable).findOne({
					where: { id: dto.tableId, organizationId: dto.organizationId },
				});
				if (!table) {
					throw new BadRequestException('Table not found');
				}
				if (table.status !== TableStatus.AVAILABLE && table.status !== TableStatus.RESERVED) {
					throw new BadRequestException(`Table is currently ${table.status.toLowerCase()}`);
				}
			}

			// Create sale + items
			const sale = manager.getRepository(Sale).create({
				date: new Date(dto.date),
				totalAmount: round2(dto.totalAmount),
				soldBy: dto.soldBy,
				paymentType: paymentType,
				cashAmount: round2(cashAmount),
				upiAmount: round2(upiAmount),
				isPaid: dto.isPaid ?? isPaid,
				organizationId: dto.organizationId,
				tableId: dto.tableId || null,
				openedAt: dto.tableId ? new Date() : null,
			});
			await manager.getRepository(Sale).save(sale);

			// Update table status if table was assigned
			if (table && !(dto.isPaid ?? isPaid)) {
				table.status = TableStatus.OCCUPIED;
				await manager.getRepository(DiningTable).save(table);
			}

			const items = dto.items.map((i) =>
				manager.getRepository(SaleItem).create({
					sale,
					productId: i.productId,
					quantity: i.quantity,
					sellingPrice: round2(i.sellingPrice),
					subtotal: round2(i.sellingPrice * i.quantity),
				}),
			);
			await manager.getRepository(SaleItem).save(items);

			// Fetch using the same transaction manager to avoid visibility issues
			const createdSale = await manager.getRepository(Sale).findOne({
				where: { id: sale.id },
				relations: ['items'],
			});
			if (!createdSale) {
				// This should not realistically happen right after insert in the same tx
				throw new NotFoundException(`Sale ${sale.id} not found`);
			}
			return createdSale;
		});
	}

	async findAll(filters: {
		from?: string;
		to?: string;
		productId?: string;
		staff?: string;
		paymentType?: string;
		organizationIds?: string[];
		page?: number;
		size?: number;
	}): Promise<{ sales: Sale[]; total: number }> {
		const qb = this.saleRepo
			.createQueryBuilder('sale')
			.leftJoinAndSelect('sale.items', 'item')
			.orderBy('sale.date', 'DESC');

		if (filters.organizationIds && filters.organizationIds.length > 0) {
			qb.andWhere('sale.organizationId IN (:...organizationIds)', {
				organizationIds: filters.organizationIds,
			});
		} else if (filters.organizationIds && filters.organizationIds.length === 0) {
			qb.andWhere('1 = 0');
		}

		if (filters.from) {
			qb.andWhere('sale.date >= :from', { from: filters.from });
		}
		if (filters.to) {
			qb.andWhere('sale.date <= :to', { to: filters.to });
		}
		if (filters.productId) {
			qb.andWhere('item.productId = :pid', { pid: filters.productId });
		}
		if (filters.staff) {
			qb.andWhere('sale.soldBy ILIKE :staff', { staff: `%${filters.staff}%` });
		}
		if (filters.paymentType) {
			qb.andWhere('sale.paymentType = :paymentType', { paymentType: filters.paymentType });
		}

		const total = await qb.getCount();

		if (filters.page && filters.size) {
			qb.skip((filters.page - 1) * filters.size).take(filters.size);
		}

		const sales = await qb.getMany();

		return { sales, total };
	}

	async dailyTotals(from?: string, to?: string, organizationIds?: string[]) {
		const qb = this.saleRepo
			.createQueryBuilder('sale')
			.select("DATE_TRUNC('day', sale.date)", 'day')
			.addSelect('SUM(sale.totalAmount)', 'total')
			.groupBy("DATE_TRUNC('day', sale.date)")
			.orderBy('day', 'DESC');

		if (organizationIds && organizationIds.length > 0) {
			qb.andWhere('sale.organizationId IN (:...organizationIds)', {
				organizationIds,
			});
		} else if (organizationIds && organizationIds.length === 0) {
			qb.andWhere('1 = 0');
		}

		if (from) qb.andWhere('sale.date >= :from', { from });
		if (to) qb.andWhere('sale.date <= :to', { to });

		return qb.getRawMany<{ day: string; total: string }>();
	}

	async findOne(id: string, organizationIds?: string[]) {
		if (!id) {
			throw new BadRequestException('id is required');
		}
		const where: any = { id };
		if (organizationIds && organizationIds.length > 0) {
			where.organizationId = In(organizationIds);
		}
		const sale = await this.saleRepo.findOne({
			where,
			relations: ['items'],
		});
		if (!sale) throw new NotFoundException(`Sale ${id} not found`);
		if (organizationIds && organizationIds.length > 0 && !organizationIds.includes(sale.organizationId)) {
			throw new NotFoundException(`Sale ${id} not found`);
		}
		return sale;
	}

	async getPaymentTypeTotals(filters: {
		from?: string;
		to?: string;
		productId?: string;
		staff?: string;
		organizationIds?: string[];
	}) {
		const qb = this.saleRepo
			.createQueryBuilder('sale')
			.select('COALESCE(SUM(sale.cashAmount), 0)', 'cashTotal')
			.addSelect('COALESCE(SUM(sale.upiAmount), 0)', 'upiTotal')
			.addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'grandTotal');

		if (filters.organizationIds && filters.organizationIds.length > 0) {
			qb.andWhere('sale.organizationId IN (:...organizationIds)', {
				organizationIds: filters.organizationIds,
			});
		} else if (filters.organizationIds && filters.organizationIds.length === 0) {
			qb.andWhere('1 = 0');
		}

		if (filters.from) {
			qb.andWhere('sale.date >= :from', { from: filters.from });
		}
		if (filters.to) {
			qb.andWhere('sale.date <= :to', { to: filters.to });
		}
		if (filters.productId) {
			qb.leftJoin('sale.items', 'item')
				.andWhere('item.productId = :pid', { pid: filters.productId });
		}
		if (filters.staff) {
			qb.andWhere('sale.soldBy ILIKE :staff', { staff: `%${filters.staff}%` });
		}

		const result = await qb.getRawOne<{ cashTotal: string; upiTotal: string; grandTotal: string }>();

		const cashTotal = parseFloat(result?.cashTotal || '0');
		const upiTotal = parseFloat(result?.upiTotal || '0');
		const grandTotal = parseFloat(result?.grandTotal || '0');

		// For backward compatibility, also check old paymentType field for records without cashAmount/upiAmount
		const legacyQb = this.saleRepo
			.createQueryBuilder('sale')
			.select('sale.paymentType', 'paymentType')
			.addSelect('SUM(sale.totalAmount)', 'total')
			.where('(sale.cashAmount IS NULL OR sale.cashAmount = 0) AND (sale.upiAmount IS NULL OR sale.upiAmount = 0)')
			.groupBy('sale.paymentType');

		if (filters.organizationIds && filters.organizationIds.length > 0) {
			legacyQb.andWhere('sale.organizationId IN (:...organizationIds)', {
				organizationIds: filters.organizationIds,
			});
		} else if (filters.organizationIds && filters.organizationIds.length === 0) {
			legacyQb.andWhere('1 = 0');
		}

		if (filters.from) {
			legacyQb.andWhere('sale.date >= :from', { from: filters.from });
		}
		if (filters.to) {
			legacyQb.andWhere('sale.date <= :to', { to: filters.to });
		}
		if (filters.productId) {
			legacyQb.leftJoin('sale.items', 'item')
				.andWhere('item.productId = :pid', { pid: filters.productId });
		}
		if (filters.staff) {
			legacyQb.andWhere('sale.soldBy ILIKE :staff', { staff: `%${filters.staff}%` });
		}

		const legacyResults = await legacyQb.getRawMany<{ paymentType: string; total: string }>();

		let legacyCash = 0;
		let legacyUPI = 0;

		legacyResults.forEach((result) => {
			const paymentType = result.paymentType || 'cash';
			const total = parseFloat(result.total || '0');
			if (paymentType.toLowerCase() === 'upi') {
				legacyUPI += total;
			} else {
				legacyCash += total;
			}
		});

		const finalCash = cashTotal + legacyCash;
		const finalUPI = upiTotal + legacyUPI;

		return {
			cash: Number(finalCash.toFixed(2)),
			UPI: Number(finalUPI.toFixed(2)),
			total: Number((finalCash + finalUPI).toFixed(2)),
		};
	}

	async update(id: string, dto: UpdateSaleDto, organizationIds?: string[]) {
		const sale = await this.findOne(id, organizationIds);
		const round2 = (n: number) => Math.round(n * 100) / 100;
		
		// Capture the original paid state BEFORE any modifications
		const wasPaidBefore = sale.isPaid;
		
		// Handle partial payment updates
		let cashAmount = dto.cashAmount !== undefined ? dto.cashAmount : (sale.cashAmount ?? 0);
		let upiAmount = dto.upiAmount !== undefined ? dto.upiAmount : (sale.upiAmount ?? 0);
		
		// Validate payment amounts
		if (dto.cashAmount !== undefined || dto.upiAmount !== undefined) {
			if (cashAmount < 0 || upiAmount < 0) {
				throw new BadRequestException('Payment amounts cannot be negative');
			}
			const totalPaid = round2(cashAmount + upiAmount);
			if (totalPaid > round2(sale.totalAmount)) {
				throw new BadRequestException('Total paid amount cannot exceed total amount');
			}
			
			// Update payment amounts
			sale.cashAmount = round2(cashAmount);
			sale.upiAmount = round2(upiAmount);
			
			// Determine payment type
			if (cashAmount > 0 && upiAmount > 0) {
				sale.paymentType = 'mixed';
			} else if (upiAmount > 0) {
				sale.paymentType = 'UPI';
			} else if (cashAmount > 0) {
				sale.paymentType = 'cash';
			}
			
			// Update isPaid status
			const totalPaidAmount = round2(cashAmount + upiAmount);
			sale.isPaid = round2(totalPaidAmount) === round2(sale.totalAmount);
		}
		
		if (dto.paymentType !== undefined) {
			sale.paymentType = dto.paymentType;
		}
		if (dto.isPaid !== undefined) {
			sale.isPaid = dto.isPaid;
		}

		const savedSale = await this.saleRepo.save(sale);

		// Handle table auto-free logic if payment was completed
		if (savedSale.isPaid && savedSale.tableId && !wasPaidBefore) {
			try {
				const settings = await this.settingsService.getSettings(savedSale.organizationId);
				if (settings.autoFreeTableOnPayment && settings.enableTables) {
					const table = await this.tablesRepo.findOne({
						where: { id: savedSale.tableId },
					});
					if (table) {
						// Check if there are other active orders on this table
						const otherActiveOrders = await this.saleRepo.count({
							where: { tableId: savedSale.tableId, isPaid: false },
						});
						if (otherActiveOrders === 0) {
							// No other active orders, set table to AVAILABLE immediately
							table.status = TableStatus.AVAILABLE;
							await this.tablesRepo.save(table);
						}
					}
				}
				savedSale.closedAt = new Date();
				await this.saleRepo.save(savedSale);
			} catch (error) {
				// Log error but don't fail the sale update
				console.error('Error handling table auto-free:', error);
			}
		}

		return savedSale;
	}

	async addItemsToSale(
		id: string,
		dto: AddItemsToSaleDto,
		organizationIds?: string[],
	): Promise<Sale> {
		return this.dataSource.transaction(async (manager) => {
			const sale = await manager.getRepository(Sale).findOne({
				where: { id },
				relations: ['items'],
			});

			if (!sale) {
				throw new NotFoundException(`Sale ${id} not found`);
			}

			if (organizationIds && organizationIds.length > 0 && !organizationIds.includes(sale.organizationId)) {
				throw new NotFoundException(`Sale ${id} not found`);
			}

			if (sale.isPaid) {
				throw new BadRequestException('Cannot add items to a paid sale');
			}

			// Validate products and stock
			const productIds = dto.items.map((i) => i.productId);
			const products = await manager.getRepository(Product).find({
				where: { 
					id: In(productIds),
					organizationId: sale.organizationId,
				},
			});
			const productMap = new Map(products.map((p) => [p.id, p]));

			for (const item of dto.items) {
				const product = productMap.get(item.productId);
				if (!product) {
					throw new BadRequestException(`Product ${item.productId} not found`);
				}
				if (product.stock < item.quantity) {
					throw new BadRequestException(
						`Insufficient stock for product ${product.name} (${product.id})`,
					);
				}
			}

			// Decrement stock
			const round2 = (n: number) => Math.round(n * 100) / 100;
			for (const item of dto.items) {
				const product = productMap.get(item.productId)!;
				product.stock = Math.max(product.stock - item.quantity, 0);
				await manager.getRepository(Product).save(product);
			}

			// Add new items
			const newItems = dto.items.map((i) =>
				manager.getRepository(SaleItem).create({
					sale,
					productId: i.productId,
					quantity: i.quantity,
					sellingPrice: round2(i.sellingPrice),
					subtotal: round2(i.sellingPrice * i.quantity),
				}),
			);
			await manager.getRepository(SaleItem).save(newItems);

			// Reload sale with all items (including newly added ones) to get accurate list
			const saleWithAllItems = await manager.getRepository(Sale).findOne({
				where: { id: sale.id },
				relations: ['items'],
			});

			if (!saleWithAllItems) {
				throw new NotFoundException(`Sale ${id} not found`);
			}

			// Recalculate total amount - ensure subtotals are parsed as numbers
			const newTotal = round2(
				saleWithAllItems.items.reduce((sum, item) => {
					const subtotal = typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : item.subtotal;
					return sum + (isNaN(subtotal) ? 0 : subtotal);
				}, 0),
			);

			saleWithAllItems.totalAmount = newTotal;
			await manager.getRepository(Sale).save(saleWithAllItems);

			// Fetch updated sale with all items
			const updatedSale = await manager.getRepository(Sale).findOne({
				where: { id: sale.id },
				relations: ['items'],
			});

			if (!updatedSale) {
				throw new NotFoundException(`Sale ${id} not found`);
			}

			return updatedSale;
		});
	}
}


