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

// Export handler for serverless environments (Vercel format)
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}

// Export handler for AWS Lambda format
export const serverlessHandler = async (event: any, context: any) => {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  
  return new Promise((resolve, reject) => {
    expressApp(event, context, (err: any, result: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Traditional bootstrap for non-serverless environments
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL && !process.env.IS_SERVERLESS && !process.cwd().startsWith('/var/task')) {
  bootstrap();
}
