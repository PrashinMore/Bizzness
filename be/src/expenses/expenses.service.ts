import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
	constructor(
		@InjectRepository(Expense)
		private readonly expenseRepo: Repository<Expense>,
	) {}

	async create(dto: CreateExpenseDto): Promise<Expense> {
		const entity = this.expenseRepo.create({
			category: dto.category,
			amount: Math.round(dto.amount * 100) / 100,
			note: dto.note ?? null,
			date: new Date(dto.date),
			addedBy: dto.addedBy,
		});
		return this.expenseRepo.save(entity);
	}

	private applyFilters(qb: SelectQueryBuilder<Expense>, filters: { from?: string; to?: string; category?: string }) {
		if (filters.from) qb.andWhere('expense.date >= :from', { from: filters.from });
		if (filters.to) qb.andWhere('expense.date <= :to', { to: filters.to });
		if (filters.category) qb.andWhere('expense.category = :cat', { cat: filters.category });
	}

	async findAll(filters: { from?: string; to?: string; category?: string }): Promise<Expense[]> {
		const qb = this.expenseRepo
			.createQueryBuilder('expense')
			.orderBy('expense.date', 'DESC');
		this.applyFilters(qb, filters);
		return qb.getMany();
	}

	async monthlySummary(from?: string, to?: string): Promise<{ month: string; total: string }[]> {
		const qb = this.expenseRepo
			.createQueryBuilder('expense')
			.select("TO_CHAR(DATE_TRUNC('month', expense.date), 'YYYY-MM')", 'month')
			.addSelect('SUM(expense.amount)', 'total')
			.groupBy("DATE_TRUNC('month', expense.date)")
			.orderBy("DATE_TRUNC('month', expense.date)", 'DESC');
		if (from) qb.andWhere('expense.date >= :from', { from });
		if (to) qb.andWhere('expense.date <= :to', { to });
		return qb.getRawMany<{ month: string; total: string }>();
	}

	async findOne(id: string): Promise<Expense> {
		const entity = await this.expenseRepo.findOne({ where: { id } });
		if (!entity) throw new NotFoundException(`Expense ${id} not found`);
		return entity;
	}

	async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
		const entity = await this.findOne(id);
		if (dto.category !== undefined) entity.category = dto.category;
		if (dto.amount !== undefined) entity.amount = Math.round(dto.amount * 100) / 100;
		if (dto.note !== undefined) entity.note = dto.note ?? null;
		if (dto.date !== undefined) entity.date = new Date(dto.date);
		if (dto.addedBy !== undefined) entity.addedBy = dto.addedBy;
		return this.expenseRepo.save(entity);
	}

	async remove(id: string): Promise<void> {
		const result = await this.expenseRepo.delete(id);
		if (result.affected === 0) {
			throw new NotFoundException(`Expense ${id} not found`);
		}
	}
}


