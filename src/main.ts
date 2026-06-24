import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter } from "@nestjs/platform-fastify";
import {AppLogger} from "./logger/app-logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useLogger(new AppLogger());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
