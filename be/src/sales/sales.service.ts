import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class SalesService {
	constructor(
		@InjectRepository(Sale)
		private readonly saleRepo: Repository<Sale>,
		@InjectRepository(SaleItem)
		private readonly saleItemRepo: Repository<SaleItem>,
		private readonly dataSource: DataSource,
	) {}

	async create(dto: CreateSaleDto) {
		// Basic consistency checks
		const computedTotal = dto.items.reduce(
			(sum, i) => sum + i.sellingPrice * i.quantity,
			0,
		);
		const round2 = (n: number) => Math.round(n * 100) / 100;
		if (round2(computedTotal) !== round2(dto.totalAmount)) {
			throw new BadRequestException('totalAmount does not match items sum');
		}

		return this.dataSource.transaction(async (manager) => {
			const productIds = dto.items.map((i) => i.productId);
			const products = await manager.getRepository(Product).find({
				where: { id: In(productIds) },
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

			// Create sale + items
			const sale = manager.getRepository(Sale).create({
				date: new Date(dto.date),
				totalAmount: round2(dto.totalAmount),
				soldBy: dto.soldBy,
				paymentType: dto.paymentType || 'cash',
			});
			await manager.getRepository(Sale).save(sale);

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
	}) {
		const qb = this.saleRepo
			.createQueryBuilder('sale')
			.leftJoinAndSelect('sale.items', 'item')
			.orderBy('sale.date', 'DESC');

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

		return qb.getMany();
	}

	async dailyTotals(from?: string, to?: string) {
		const qb = this.saleRepo
			.createQueryBuilder('sale')
			.select("DATE_TRUNC('day', sale.date)", 'day')
			.addSelect('SUM(sale.totalAmount)', 'total')
			.groupBy("DATE_TRUNC('day', sale.date)")
			.orderBy('day', 'DESC');

		if (from) qb.andWhere('sale.date >= :from', { from });
		if (to) qb.andWhere('sale.date <= :to', { to });

		return qb.getRawMany<{ day: string; total: string }>();
	}

	async findOne(id: string) {
		if (!id) {
			throw new BadRequestException('id is required');
		}
		const sale = await this.saleRepo.findOne({
			where: { id },
			relations: ['items'],
		});
		if (!sale) throw new NotFoundException(`Sale ${id} not found`);
		return sale;
	}

	async getPaymentTypeTotals(filters: {
		from?: string;
		to?: string;
		productId?: string;
		staff?: string;
	}) {
		const qb = this.saleRepo
			.createQueryBuilder('sale')
			.select('sale.paymentType', 'paymentType')
			.addSelect('SUM(sale.totalAmount)', 'total')
			.groupBy('sale.paymentType');

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

		const results = await qb.getRawMany<{ paymentType: string; total: string }>();

		// Initialize totals
		const totals = {
			cash: 0,
			UPI: 0,
		};

		// Sum up totals by payment type
		results.forEach((result) => {
			const paymentType = result.paymentType || 'cash';
			const total = parseFloat(result.total || '0');
			if (paymentType.toLowerCase() === 'upi') {
				totals.UPI += total;
			} else {
				totals.cash += total;
			}
		});

		return {
			cash: Number(totals.cash.toFixed(2)),
			UPI: Number(totals.UPI.toFixed(2)),
			total: Number((totals.cash + totals.UPI).toFixed(2)),
		};
	}
}


