import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';

async function backfillSaleOutletId() {
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
    entities: [], // We're using raw SQL, so no entities needed
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Check if there are any sales with NULL outletId
    const nullCountResult = await dataSource.query(
      `SELECT COUNT(*) as count FROM sale WHERE "outletId" IS NULL`
    );
    const nullCount = parseInt(nullCountResult[0].count, 10);

    if (nullCount === 0) {
      console.log('✅ All sales already have an outletId. No backfill needed.');
      return;
    }

    console.log(`📝 Found ${nullCount} sales with NULL outletId. Backfilling...`);

    // Backfill sales with the primary outlet for each organization
    // If no primary outlet exists, use the first active outlet
    // If no outlet exists, create a default one
    const backfillResult = await dataSource.query(`
      WITH org_outlets AS (
        SELECT DISTINCT ON (s."organizationId")
          s."organizationId",
          COALESCE(
            (SELECT o.id FROM outlets o 
             WHERE o."organizationId" = s."organizationId" 
             AND o."isPrimary" = true 
             AND o."isActive" = true 
             LIMIT 1),
            (SELECT o.id FROM outlets o 
             WHERE o."organizationId" = s."organizationId" 
             AND o."isActive" = true 
             ORDER BY o."createdAt" ASC 
             LIMIT 1)
          ) as outlet_id
        FROM sale s
        WHERE s."outletId" IS NULL
      )
      UPDATE sale s
      SET "outletId" = org_outlets.outlet_id
      FROM org_outlets
      WHERE s."organizationId" = org_outlets."organizationId"
        AND s."outletId" IS NULL
        AND org_outlets.outlet_id IS NOT NULL
    `);

    console.log(`✅ Backfilled sales with outletId`);

    // Check if there are still any NULL values (organizations without outlets)
    const remainingNullResult = await dataSource.query(
      `SELECT COUNT(*) as count FROM sale WHERE "outletId" IS NULL`
    );
    const remainingNull = parseInt(remainingNullResult[0].count, 10);

    if (remainingNull > 0) {
      console.log(`⚠️  Warning: ${remainingNull} sales still have NULL outletId.`);
      console.log('   These belong to organizations without any outlets.');
      console.log('   Creating default outlets for these organizations...');

      // Create default outlets for organizations that don't have any
      await dataSource.query(`
        INSERT INTO outlets ("organizationId", name, "isPrimary", "isActive", "createdAt", "updatedAt")
        SELECT DISTINCT
          s."organizationId",
          'Main Outlet' as name,
          true as "isPrimary",
          true as "isActive",
          now() as "createdAt",
          now() as "updatedAt"
        FROM sale s
        WHERE s."outletId" IS NULL
          AND s."organizationId" NOT IN (
            SELECT DISTINCT "organizationId" FROM outlets WHERE "organizationId" IS NOT NULL
          )
      `);

      // Now backfill again
      await dataSource.query(`
        UPDATE sale s
        SET "outletId" = (
          SELECT o.id
          FROM outlets o
          WHERE o."organizationId" = s."organizationId"
            AND o."isPrimary" = true
          LIMIT 1
        )
        WHERE s."outletId" IS NULL
      `);

      const finalCheck = await dataSource.query(
        `SELECT COUNT(*) as count FROM sale WHERE "outletId" IS NULL`
      );
      const finalNull = parseInt(finalCheck[0].count, 10);

      if (finalNull === 0) {
        console.log('✅ All sales now have an outletId!');
      } else {
        console.error(`❌ Error: ${finalNull} sales still have NULL outletId after creating default outlets.`);
        throw new Error('Failed to backfill all sales with outletId');
      }
    } else {
      console.log('✅ All sales now have an outletId!');
    }

    console.log('🔄 You can now restart your NestJS application.');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

backfillSaleOutletId();

