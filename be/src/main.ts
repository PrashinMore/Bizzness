import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

let cachedApp: NestExpressApplication | null = null;

async function bootstrap() {
  // Detect serverless environment
  const isServerless = 
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.VERCEL ||
    !!process.env.IS_SERVERLESS ||
    process.cwd().startsWith('/var/task');

  // Reuse cached app in serverless environments
  if (isServerless && cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Serve static files from uploads directory
  // In serverless, use /tmp; otherwise use process.cwd()
  const uploadsPath = isServerless 
    ? join('/tmp', 'uploads')
    : join(process.cwd(), 'uploads');
  
  try {
    app.useStaticAssets(uploadsPath, {
      prefix: '/uploads',
    });
  } catch (error) {
    console.warn('Could not serve static files from uploads directory:', error);
    // In serverless environments, static file serving may not work
    // Consider using cloud storage (S3, etc.) instead
  }

  // CORS configuration - allow requests from anywhere
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // In serverless, don't call listen, just return the app
  if (isServerless) {
    await app.init();
    cachedApp = app;
    return app;
  }

  // Traditional server startup
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  return app;
}

// Traditional bootstrap for non-serverless environments
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL && !process.env.IS_SERVERLESS && !process.cwd().startsWith('/var/task')) {
  bootstrap();
}

// Handler for serverless environments (Vercel format)
// Defined as const to avoid hoisting issues with exports
const handler = async (req: any, res: any) => {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
};

// Export handler for serverless environments
export default handler;
export { handler as serverlessHandler };

// Ensure CommonJS compatibility for serverless platforms
// This ensures exports are available even if ES modules aren't fully supported
if (typeof module !== 'undefined') {
  (module as any).exports = handler;
  (module as any).exports.default = handler;
  (module as any).exports.serverlessHandler = handler;
  (module as any).exports.handler = handler;
}
