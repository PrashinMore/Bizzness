import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detect serverless environment
  const isServerless = 
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.VERCEL ||
    !!process.env.IS_SERVERLESS ||
    process.cwd().startsWith('/var/task');

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

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
}
bootstrap();
