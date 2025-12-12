import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Servir archivos estáticos (evidencias de pago)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174', // Puerto alternativo de Vite
      'http://172.203.16.202',
      'https://172.203.16.202',
      'http://ngso-chat.assoftware.xyz',
      'https://ngso-chat.assoftware.xyz',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Security
  app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitado para desarrollo
  }));

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NGS&O CRM Gestión API')
      .setDescription('Sistema de Gestión de Cobranzas con WhatsApp - Desarrollado por AS Software')
      .setVersion('1.0.0')
      .setContact('AS Software', 'https://as-software.com', 'contacto@as-software.com')
      .addBearerAuth()
      .addTag('auth', 'Autenticación y autorización')
      .addTag('users', 'Gestión de usuarios y gestores')
      .addTag('roles', 'Gestión de roles y permisos')
      .addTag('campaigns', 'Gestión de campañas de cobranza')
      .addTag('whatsapp', 'Integración con WhatsApp')
      .addTag('chats', 'Gestión de conversaciones')
      .addTag('messages', 'Gestión de mensajes')
      .addTag('bot', 'Bot de cobranza automatizado')
      .addTag('clients', 'Gestión de clientes deudores')
      .addTag('tasks', 'Gestión de tareas de cobranza')
      .addTag('reports', 'Reportes y analytics de gestión')
      .addTag('audit', 'Auditoría y trazabilidad')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger documentation available at http://localhost:${process.env.PORT}/api/docs`);
  }

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`╔════════════════════════════════════════════════════════╗`);
  logger.log(`║   NGS&O CRM Gestión - Sistema de Cobranzas           ║`);
  logger.log(`║   Desarrollado por: AS Software                       ║`);
  logger.log(`╚════════════════════════════════════════════════════════╝`);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
