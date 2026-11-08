import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.register(fastifyCookie);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: ['http://localhost:3000', 'https://ddotsinvoice.com'], credentials: true });

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('DdotsInvoice API').setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}

void bootstrap();
