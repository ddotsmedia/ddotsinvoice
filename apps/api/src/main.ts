import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TenantContextInterceptor());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,https://ddotsinvoice.com').split(','),
    credentials: true,
  });

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('DdotsInvoice API').setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}

void bootstrap();
