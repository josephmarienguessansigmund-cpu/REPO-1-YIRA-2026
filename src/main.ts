import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Validation des données entrantes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // 2. Configuration du CORS pour vos nouveaux domaines
  app.enableCors({
    origin: [
      'https://orientations.yira-ci.com',
      'https://www.yira-ci.com',
      'https://yira-ci.com',
      /\.railway\.app$/, // Autorise aussi les sous-domaines Railway pour les tests
      'http://localhost:3000', // Pour vos tests locaux
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 3. Préfixe global (Important pour vos tests PowerShell)
  app.setGlobalPrefix('api/v1');

  // 4. Port dynamique pour Railway
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 YIRA API lancée sur le port ${port}`);
  console.log(`🌍 Domaines autorisés : orientations.yira-ci.com`);
}

bootstrap();