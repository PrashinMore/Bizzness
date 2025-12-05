import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceCounter } from './entities/invoice-counter.entity';
import { OrganizationInvoiceSettings } from './entities/organization-invoice-settings.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Settings } from '../settings/entities/settings.entity';
import { Product } from '../products/entities/product.entity';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { StorageService } from '../products/storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceCounter,
      OrganizationInvoiceSettings,
      Sale,
      Settings,
      Product,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfGeneratorService, StorageService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

