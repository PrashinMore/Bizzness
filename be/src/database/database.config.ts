import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds TypeORM options from env in a host-agnostic way.
 *
 * Resolution order for connection details:
 *   1. DATABASE_URL / POSTGRES_URL_NON_POOLING / POSTGRES_URL / POSTGRES_PRISMA_URL
 *   2. Individual DB_* (or POSTGRES_*) variables
 *
 * Also normalizes common Supabase misconfigurations (e.g. setting DB_HOST to
 * the username `postgres.<ref>` instead of a real hostname) and tunes the
 * connection pool for serverless vs long-running Node processes.
 */
type ParsedDatabaseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
};

function parseDatabaseUrl(connectionUrl: string): ParsedDatabaseConfig {
  const parsed = new URL(connectionUrl);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
    ssl:
      parsed.searchParams.get('sslmode') === 'require' ||
      parsed.hostname.includes('supabase'),
  };
}

function extractSupabaseProjectRef(
  configService: ConfigService,
): string | null {
  const supabaseUrl = configService.get<string>('SUPABASE_URL');
  if (!supabaseUrl) {
    return null;
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const ref = hostname.replace('.supabase.co', '');
    return ref || null;
  } catch {
    return null;
  }
}

function resolveHost(configService: ConfigService): string {
  const dbHost =
    configService.get<string>('DB_HOST') ??
    configService.get<string>('DBHOST') ??
    configService.get<string>('POSTGRES_HOST');

  if (!dbHost) {
    return 'localhost';
  }

  // Common deployment mistake: DB_HOST set to "postgres.<project-ref>" (the DB user, not hostname).
  if (/^postgres\.[a-z0-9]+$/.test(dbHost)) {
    const poolerHost = configService.get<string>('POSTGRES_HOST');
    if (poolerHost) {
      return poolerHost;
    }

    return 'aws-1-us-east-1.pooler.supabase.com';
  }

  // Short project ref only, e.g. "kfpcrxvfqtkltskqqdho"
  if (/^[a-z0-9]{20}$/.test(dbHost)) {
    const poolerHost = configService.get<string>('POSTGRES_HOST');
    if (poolerHost) {
      return poolerHost;
    }
    return `db.${dbHost}.supabase.co`;
  }

  return dbHost;
}

function resolveFromEnvVars(
  configService: ConfigService,
): ParsedDatabaseConfig {
  const host = resolveHost(configService);
  const port = parseInt(configService.get<string>('DB_PORT') ?? '5432', 10);
  const username =
    configService.get<string>('DB_USER') ??
    configService.get<string>('POSTGRES_USER') ??
    'postgres';
  const password =
    configService.get<string>('DB_PASSWORD') ??
    configService.get<string>('POSTGRES_PASSWORD') ??
    'postgres';
  const database =
    configService.get<string>('DB_NAME') ??
    configService.get<string>('POSTGRES_DATABASE') ??
    'postgres';

  const isSupabase =
    host.includes('supabase.co') ||
    host.includes('pooler.supabase.com') ||
    Boolean(extractSupabaseProjectRef(configService));

  return {
    host,
    port,
    username,
    password,
    database,
    ssl: isSupabase,
  };
}

export function buildTypeOrmConfig(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const connectionUrl =
    configService.get<string>('DATABASE_URL') ??
    configService.get<string>('POSTGRES_URL_NON_POOLING') ??
    configService.get<string>('POSTGRES_URL') ??
    configService.get<string>('POSTGRES_PRISMA_URL');

  const dbConfig = connectionUrl
    ? parseDatabaseUrl(connectionUrl)
    : resolveFromEnvVars(configService);

  const isSupabase =
    dbConfig.host.includes('supabase.co') ||
    dbConfig.host.includes('pooler.supabase.com');

  const isServerless =
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.VERCEL ||
    !!process.env.IS_SERVERLESS ||
    process.cwd().startsWith('/var/task');

  const isPooler = dbConfig.port === 6543;

  const serverlessPoolConfig = {
    max: 1,
    min: 0,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  };

  const regularPoolConfig = isPooler
    ? {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };

  const poolConfig = isServerless ? serverlessPoolConfig : regularPoolConfig;

  if (process.env.NODE_ENV !== 'test') {
    console.log(
      `[Database] Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} as ${dbConfig.username} (ssl=${dbConfig.ssl})`,
    );
  }

  return {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    synchronize: true,
    autoLoadEntities: true,
    retryAttempts: isServerless ? 3 : 10,
    retryDelay: isServerless ? 2000 : 3000,
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
    extra: {
      ...(dbConfig.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
      ...poolConfig,
      ...(isServerless && {
        maxUses: 1,
        allowExitOnIdle: true,
      }),
    },
  };
}
