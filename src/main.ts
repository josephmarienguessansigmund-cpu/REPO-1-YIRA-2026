import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { validateStartup } from './common/startup.validator';

async function bootstrap() {
  // -- Validation des variables d'environnement au d�marrage --
  validateStartup();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // -- S�curit� HTTP headers -----------------------------------
  app.use((helmet as any).default ? (helmet as any).default() : (helmet as any)());

  // -- CORS �tendu � tous les domaines YIRA + GitHub Pages ----
  app.enableCors({
    origin: [
      'https://orientations.yira-ci.com',
      'https://www.yira-ci.com',
      'https://yira-ci.com',
      'https://josephmarienguessansigmund-cpu.github.io',
      // Pays CEDEAO
      'https://orientations.yira-bf.com',
      'https://orientations.yira-ml.com',
      'https://orientations.yira-sn.com',
      'https://orientations.yira-ne.com',
      'https://orientations.yira-gn.com',
      'https://orientations.yira-gh.com',
      /\.railway\.app$/,
      /\.github\.io$/,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://repo-2-yira-2026-bx7m.vercel.app',
      /\.vercel\.app$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Country-Code'],
  });

  // -- Pr�fixe global API --------------------------------------
  app.setGlobalPrefix('api/v1');

  // -- ValidationPipe global ----------------------------------
  // NOTE : forbidNonWhitelisted retir� � les DTOs any() le bloqueraient
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false, // ? CORRIG� : les body any() passent
    transformOptions: { enableImplicitConversion: true },
  }));

  // -- Global Exception Filter --------------------------------
  app.useGlobalFilters(new GlobalExceptionFilter());

  // -- D�marrage ----------------------------------------------
  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`?? YIRA API d�marr�e � port ${port}`);
  logger.log(`?? 7 pays CEDEAO actifs � CI BF ML SN NE GN GH`);
  logger.log(`?? NIE-Coach actif � ${process.env.ANTHROPIC_API_KEY ? 'Claude Haiku' : process.env.GEMINI_API_KEY ? 'Gemini' : '?? Aucune cl� IA'}`);
}

bootstrap();

