import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  // Load environment variables
  const configModule = ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  });
  
  const configService = new ConfigService();
  
  const host = configService.get<string>('DB_HOST') ?? configService.get<string>('DBHOST') ?? 'localhost';
  const port = parseInt(configService.get<string>('DB_PORT') ?? '5432', 10);
  const username = configService.get<string>('DB_USER') ?? 'postgres';
  const password = configService.get<string>('DB_PASSWORD') ?? 'postgres';
  const database = configService.get<string>('DB_NAME') ?? 'biznes';

  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/001_setup_pg_trgm.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await dataSource.query(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (err: any) {
          // Ignore "already exists" errors
          if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
            console.log(`ℹ️  Statement ${i + 1}: ${err.message.split('\n')[0]}`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, err.message);
            throw err;
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('🔄 Please restart your NestJS application for changes to take effect.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigration();

