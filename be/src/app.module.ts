import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { ProductsModule } from './products/products.module';
import { Product } from './products/entities/product.entity';
import { SalesModule } from './sales/sales.module';
import { Sale } from './sales/entities/sale.entity';
import { SaleItem } from './sales/entities/sale-item.entity';
import { ExpensesModule } from './expenses/expenses.module';
import { Expense } from './expenses/entities/expense.entity';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { Settings } from './settings/entities/settings.entity';
import { ReportsModule } from './reports/reports.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { Organization } from './organizations/entities/organization.entity';
import { CategoriesModule } from './categories/categories.module';
import { Category } from './categories/entities/category.entity';
import { GlobalProduct } from './products/entities/global-product.entity';
import { InvoicesModule } from './invoices/invoices.module';
import { Invoice } from './invoices/entities/invoice.entity';
import { InvoiceCounter } from './invoices/entities/invoice-counter.entity';
import { OrganizationInvoiceSettings } from './invoices/entities/organization-invoice-settings.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST') ?? configService.get<string>('DBHOST') ?? 'localhost';
        // const isSupabase = host.includes('supabase.co');
        const isSupabase = false;
        
        // Detect serverless environment
        const isServerless = 
          !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
          !!process.env.VERCEL ||
          !!process.env.IS_SERVERLESS ||
          process.cwd().startsWith('/var/task');
        
        const port = parseInt(configService.get<string>('DB_PORT') ?? '5432', 10);
        const isPooler = port === 6543; // Supabase connection pooler port
        
        // Serverless-optimized connection settings
        const serverlessPoolConfig = {
          max: 1, // Single connection for serverless
          min: 0,
          idleTimeoutMillis: 5000, // Close idle connections quickly
          connectionTimeoutMillis: 3000, // Very short timeout for serverless (3 seconds)
          statement_timeout: 5000, // Query timeout
        };
        
        // Regular pool configuration
        const regularPoolConfig = isPooler
          ? {
              max: 10, // Limit for Session mode pooler
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000,
            }
          : {
              max: 20, // Higher limit for direct connection
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000,
            };
        
        const baseConfig = {
          type: 'postgres' as const,
          host,
          port,
          username: configService.get<string>('DB_USER') ?? 'postgres',
          password: configService.get<string>('DB_PASSWORD') ?? 'postgres',
          database: configService.get<string>('DB_NAME') ?? 'biznes',
          entities: [User, Product, Sale, SaleItem, Expense, Settings, Organization, Category, GlobalProduct, Invoice, InvoiceCounter, OrganizationInvoiceSettings],
          synchronize: true,
          // Disable retries completely in serverless to fail fast
          retryAttempts: isServerless ? 0 : 10,
          retryDelay: isServerless ? 0 : 3000,
          // Auto-reconnect settings
          autoLoadEntities: true,
          keepConnectionAlive: !isServerless, // Don't keep connections alive in serverless
        };

        // SSL configuration for Supabase and other cloud databases
        if (isSupabase || isServerless) {
          const poolConfig = isServerless ? serverlessPoolConfig : regularPoolConfig;
          
          return {
            ...baseConfig,
            extra: {
              ssl: isSupabase ? {
                rejectUnauthorized: false,
              } : undefined,
              ...poolConfig,
              // Disable automatic retries in the pool
              ...(isServerless && {
                maxUses: 1, // Use connection only once in serverless
                allowExitOnIdle: true, // Allow process to exit when idle
              }),
            },
          };
        }

        return {
          ...baseConfig,
          extra: regularPoolConfig,
        };
      },
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
