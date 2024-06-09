import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

const logger = new Logger();
const PORT = process.env.PORT || 5002;

async function start() {
  
  const app = await NestFactory.createMicroservice(AppModule, { 
    transport: Transport.TCP,
    options: {
      host: process.env.HOST,
      port: PORT
    }
  });


  await app.listen();
}

start().then(() => logger.log(`Portal-ms started on port ${PORT}`));
