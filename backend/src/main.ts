import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable CORS for Vite React
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // ✅ Enable DTO validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // removes extra fields
      forbidNonWhitelisted: true, // throws error for unknown fields
      transform: true,  
      transformOptions:{
        enableImplicitConversion:true,
      },      // auto-transform payloads
    }),
  );

  // ✅ API prefix
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
