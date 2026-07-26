import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationRequiredMiddleware } from './common/middleware/organization-required.middleware';
import { JWT_CONFIG } from './auth/jwt.config';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CategoriesModule } from './categories/categories.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TablesModule } from './tables/tables.module';
import { OutletsModule } from './outlets/outlets.module';
import { StockModule } from './stock/stock.module';
import { RecipesModule } from './recipes/recipes.module';
import { InventoryModule } from './inventory/inventory.module';
import { CrmModule } from './crm/crm.module';
import { buildTypeOrmConfig } from './database/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        buildTypeOrmConfig(configService),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    SalesModule,
    ExpensesModule,
    DashboardModule,
    SettingsModule,
    ReportsModule,
    OrganizationsModule,
    CategoriesModule,
    InvoicesModule,
    TablesModule,
    OutletsModule,
    StockModule,
    RecipesModule,
    InventoryModule,
    CrmModule,
  ],
  controllers: [AppController],
  providers: [AppService, OrganizationRequiredMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OrganizationRequiredMiddleware).forRoutes('*');
  }
}
