import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
	constructor(
		@InjectRepository(Expense)
		private readonly expenseRepo: Repository<Expense>,
	) {}

	async create(dto: CreateExpenseDto & { organizationId: string }): Promise<Expense> {
		const entity = this.expenseRepo.create({
			category: dto.category,
			amount: Math.round(dto.amount * 100) / 100,
			note: dto.note ?? null,
			date: new Date(dto.date),
			addedBy: dto.addedBy,
			organizationId: dto.organizationId,
		});
		return this.expenseRepo.save(entity);
	}

	private applyFilters(qb: SelectQueryBuilder<Expense>, filters: { from?: string; to?: string; category?: string; organizationIds?: string[] }) {
		if (filters.organizationIds && filters.organizationIds.length > 0) {
			qb.andWhere('expense.organizationId IN (:...organizationIds)', {
				organizationIds: filters.organizationIds,
			});
		} else if (filters.organizationIds && filters.organizationIds.length === 0) {
			qb.andWhere('1 = 0');
		}
		if (filters.from) qb.andWhere('expense.date >= :from', { from: filters.from });
		if (filters.to) qb.andWhere('expense.date <= :to', { to: filters.to });
		if (filters.category) qb.andWhere('expense.category = :cat', { cat: filters.category });
	}

	async findAll(filters: { from?: string; to?: string; category?: string; organizationIds?: string[] }): Promise<Expense[]> {
		const qb = this.expenseRepo
			.createQueryBuilder('expense')
			.orderBy('expense.date', 'DESC');
		this.applyFilters(qb, filters);
		return qb.getMany();
	}

	async monthlySummary(from?: string, to?: string, organizationIds?: string[]): Promise<{ month: string; total: string }[]> {
		const qb = this.expenseRepo
			.createQueryBuilder('expense')
			.select("TO_CHAR(DATE_TRUNC('month', expense.date), 'YYYY-MM')", 'month')
			.addSelect('SUM(expense.amount)', 'total')
			.groupBy("DATE_TRUNC('month', expense.date)")
			.orderBy("DATE_TRUNC('month', expense.date)", 'DESC');
		if (organizationIds && organizationIds.length > 0) {
			qb.andWhere('expense.organizationId IN (:...organizationIds)', {
				organizationIds,
			});
		} else if (organizationIds && organizationIds.length === 0) {
			qb.andWhere('1 = 0');
		}
		if (from) qb.andWhere('expense.date >= :from', { from });
		if (to) qb.andWhere('expense.date <= :to', { to });
		return qb.getRawMany<{ month: string; total: string }>();
	}

	async findOne(id: string, organizationIds?: string[]): Promise<Expense> {
		const where: any = { id };
		if (organizationIds && organizationIds.length > 0) {
			where.organizationId = In(organizationIds);
		}
		const entity = await this.expenseRepo.findOne({ where });
		if (!entity) throw new NotFoundException(`Expense ${id} not found`);
		if (organizationIds && organizationIds.length > 0 && !organizationIds.includes(entity.organizationId)) {
			throw new NotFoundException(`Expense ${id} not found`);
		}
		return entity;
	}

	async update(id: string, dto: UpdateExpenseDto, organizationIds?: string[]): Promise<Expense> {
		const entity = await this.findOne(id, organizationIds);
		if (dto.category !== undefined) entity.category = dto.category;
		if (dto.amount !== undefined) entity.amount = Math.round(dto.amount * 100) / 100;
		if (dto.note !== undefined) entity.note = dto.note ?? null;
		if (dto.date !== undefined) entity.date = new Date(dto.date);
		if (dto.addedBy !== undefined) entity.addedBy = dto.addedBy;
		return this.expenseRepo.save(entity);
	}

	async remove(id: string, organizationIds?: string[]): Promise<void> {
		const entity = await this.findOne(id, organizationIds);
		await this.expenseRepo.remove(entity);
	}
}


