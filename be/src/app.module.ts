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
        const isSupabase = host.includes('supabase.co');
        
        const port = parseInt(configService.get<string>('DB_PORT') ?? '5432', 10);
        const isPooler = port === 6543; // Supabase connection pooler port
        
        const baseConfig = {
          type: 'postgres' as const,
          host,
          port,
          username: configService.get<string>('DB_USER') ?? 'postgres',
          password: configService.get<string>('DB_PASSWORD') ?? 'postgres',
          database: configService.get<string>('DB_NAME') ?? 'biznes',
          entities: [User, Product, Sale, SaleItem, Expense],
          synchronize: true,
        };

        // SSL configuration for Supabase and other cloud databases
        if (isSupabase) {
          // Connection pool configuration to avoid "MaxClientsInSessionMode" error
          // Supabase Session mode pooler (port 6543) has strict connection limits
          const poolConfig = isPooler
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

          return {
            ...baseConfig,
            extra: {
              ssl: {
                rejectUnauthorized: false,
              },
              ...poolConfig,
            },
          };
        }

        return baseConfig;
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    SalesModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
