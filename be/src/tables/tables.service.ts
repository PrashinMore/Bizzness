import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DiningTable, TableStatus } from './entities/dining-table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { Sale } from '../sales/entities/sale.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(DiningTable)
    private readonly tablesRepository: Repository<DiningTable>,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  private async validateTableAccess(
    tableId: string,
    organizationIds: string[],
  ): Promise<DiningTable> {
    const table = await this.tablesRepository.findOne({
      where: { id: tableId, organizationId: In(organizationIds) },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async create(
    dto: CreateTableDto,
    organizationId: string,
  ): Promise<DiningTable> {
    // Check if tables are enabled
    const settings = await this.settingsService.getSettings(organizationId);
    if (!settings.enableTables) {
      throw new ForbiddenException('Table management is not enabled for this organization');
    }

    // Check for duplicate name in the same organization
    const existing = await this.tablesRepository.findOne({
      where: { name: dto.name, organizationId, isActive: true },
    });
    if (existing) {
      throw new BadRequestException('A table with this name already exists');
    }

    const table = this.tablesRepository.create({
      ...dto,
      organizationId,
      status: TableStatus.AVAILABLE,
    });
    return this.tablesRepository.save(table);
  }

  async findAll(organizationIds: string[]): Promise<DiningTable[]> {
    return this.tablesRepository.find({
      where: { organizationId: In(organizationIds), isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, organizationIds: string[]): Promise<DiningTable> {
    return this.validateTableAccess(id, organizationIds);
  }

  async update(
    id: string,
    dto: UpdateTableDto,
    organizationIds: string[],
  ): Promise<DiningTable> {
    const table = await this.validateTableAccess(id, organizationIds);

    // If updating name, check for duplicates
    if (dto.name && dto.name !== table.name) {
      const existing = await this.tablesRepository.findOne({
        where: {
          name: dto.name,
          organizationId: table.organizationId,
          isActive: true,
        },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('A table with this name already exists');
      }
    }

    Object.assign(table, dto);
    return this.tablesRepository.save(table);
  }

  async remove(id: string, organizationIds: string[]): Promise<void> {
    const table = await this.validateTableAccess(id, organizationIds);

    // Check if table has active orders
    const activeOrders = await this.salesRepository.count({
      where: {
        tableId: id,
        isPaid: false,
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException(
        'Cannot delete table with active orders. Please close all orders first.',
      );
    }

    // Soft delete
    table.isActive = false;
    await this.tablesRepository.save(table);
  }

  async updateStatus(
    id: string,
    dto: UpdateTableStatusDto,
    organizationIds: string[],
  ): Promise<DiningTable> {
    const table = await this.validateTableAccess(id, organizationIds);

    // Validation logic
    if (dto.status === TableStatus.OCCUPIED) {
      // Only allow OCCUPIED if there's an active order
      const activeOrder = await this.salesRepository.findOne({
        where: { tableId: id, isPaid: false },
      });
      if (!activeOrder) {
        throw new BadRequestException(
          'Cannot set table to OCCUPIED without an active order',
        );
      }
    } else if (dto.status === TableStatus.AVAILABLE) {
      // Only allow AVAILABLE if no active orders
      const activeOrder = await this.salesRepository.findOne({
        where: { tableId: id, isPaid: false },
      });
      if (activeOrder) {
        throw new BadRequestException(
          'Cannot set table to AVAILABLE with active orders',
        );
      }
    }

    table.status = dto.status;
    return this.tablesRepository.save(table);
  }

  async assignTableToSale(
    saleId: string,
    tableId: string,
    organizationIds: string[],
  ): Promise<{ sale: Sale; table: DiningTable }> {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.getRepository(Sale).findOne({
        where: { id: saleId, organizationId: In(organizationIds) },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      if (sale.isPaid) {
        throw new BadRequestException('Cannot assign table to a paid sale');
      }

      const table = await this.validateTableAccess(tableId, organizationIds);

      // If table is not available, check if it's already assigned to this sale
      if (table.status !== TableStatus.AVAILABLE && table.status !== TableStatus.RESERVED) {
        if (table.id !== sale.tableId) {
          throw new BadRequestException(
            `Table is currently ${table.status.toLowerCase()}`,
          );
        }
      }

      // Free the old table if there was one
      if (sale.tableId && sale.tableId !== tableId) {
        const oldTable = await manager.getRepository(DiningTable).findOne({
          where: { id: sale.tableId },
        });
        if (oldTable) {
          // Check if old table has other active orders
          const otherActiveOrders = await manager.getRepository(Sale).count({
            where: { tableId: oldTable.id, isPaid: false },
          });
          if (otherActiveOrders === 1) {
            // This was the only active order
            oldTable.status = TableStatus.AVAILABLE;
            await manager.getRepository(DiningTable).save(oldTable);
          }
        }
      }

      // Assign new table
      sale.tableId = tableId;
      sale.openedAt = sale.openedAt || new Date();
      await manager.getRepository(Sale).save(sale);

      table.status = TableStatus.OCCUPIED;
      await manager.getRepository(DiningTable).save(table);

      return { sale, table };
    });
  }

  async switchTable(
    saleId: string,
    toTableId: string,
    organizationIds: string[],
  ): Promise<{ sale: Sale; fromTable: DiningTable | null; toTable: DiningTable }> {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.getRepository(Sale).findOne({
        where: { id: saleId, organizationId: In(organizationIds) },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      if (sale.isPaid) {
        throw new BadRequestException('Cannot switch table for a paid sale');
      }

      const toTable = await this.validateTableAccess(toTableId, organizationIds);

      if (toTable.status !== TableStatus.AVAILABLE && toTable.status !== TableStatus.RESERVED) {
        throw new BadRequestException(`Target table is currently ${toTable.status.toLowerCase()}`);
      }

      let fromTable: DiningTable | null = null;

      // Free the old table
      if (sale.tableId) {
        fromTable = await manager.getRepository(DiningTable).findOne({
          where: { id: sale.tableId },
        });
        if (fromTable) {
          // Check if old table has other active orders
          const otherActiveOrders = await manager.getRepository(Sale).count({
            where: { tableId: fromTable.id, isPaid: false },
          });
          if (otherActiveOrders === 1) {
            // This was the only active order
            fromTable.status = TableStatus.AVAILABLE;
            await manager.getRepository(DiningTable).save(fromTable);
          }
        }
      }

      // Assign new table
      sale.tableId = toTableId;
      await manager.getRepository(Sale).save(sale);

      toTable.status = TableStatus.OCCUPIED;
      await manager.getRepository(DiningTable).save(toTable);

      return { sale, fromTable, toTable };
    });
  }

  async mergeTables(
    sourceTableIds: string[],
    targetTableId: string,
    organizationIds: string[],
  ): Promise<{ targetTable: DiningTable; sourceTables: DiningTable[] }> {
    const settings = await this.settingsService.getSettings(organizationIds[0]);
    if (!settings.allowTableMerge) {
      throw new ForbiddenException('Table merging is not enabled for this organization');
    }

    return this.dataSource.transaction(async (manager) => {
      const targetTable = await this.validateTableAccess(targetTableId, organizationIds);

      if (targetTable.status !== TableStatus.AVAILABLE && targetTable.status !== TableStatus.RESERVED) {
        throw new BadRequestException('Target table must be available for merging');
      }

      const sourceTables: DiningTable[] = [];
      for (const sourceId of sourceTableIds) {
        if (sourceId === targetTableId) {
          continue; // Skip if source is same as target
        }
        const sourceTable = await this.validateTableAccess(sourceId, organizationIds);
        sourceTables.push(sourceTable);
      }

      // Move all active orders from source tables to target table
      for (const sourceTable of sourceTables) {
        await manager.getRepository(Sale).update(
          { tableId: sourceTable.id, isPaid: false },
          { tableId: targetTableId },
        );
        sourceTable.status = TableStatus.BLOCKED;
        await manager.getRepository(DiningTable).save(sourceTable);
      }

      // Set target table to occupied if it has orders now
      const orderCount = await manager.getRepository(Sale).count({
        where: { tableId: targetTableId, isPaid: false },
      });
      if (orderCount > 0) {
        targetTable.status = TableStatus.OCCUPIED;
        await manager.getRepository(DiningTable).save(targetTable);
      }

      return { targetTable, sourceTables };
    });
  }

  async getTableWithOrders(
    id: string,
    organizationIds: string[],
  ): Promise<DiningTable & { activeOrder?: Sale; orderHistory?: Sale[] }> {
    const table = await this.tablesRepository.findOne({
      where: { id, organizationId: In(organizationIds) },
      relations: ['sales'],
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const activeOrder = await this.salesRepository.findOne({
      where: { tableId: id, isPaid: false },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    const orderHistory = await this.salesRepository.find({
      where: { tableId: id, isPaid: true },
      order: { closedAt: 'DESC' },
      take: 10,
    });

    return {
      ...table,
      activeOrder: activeOrder || undefined,
      orderHistory: orderHistory || undefined,
    };
  }

  async getActiveSaleForTable(
    id: string,
    organizationIds: string[],
  ): Promise<Sale | null> {
    const table = await this.validateTableAccess(id, organizationIds);
    
    const activeSale = await this.salesRepository.findOne({
      where: { tableId: id, isPaid: false },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return activeSale || null;
  }
}
