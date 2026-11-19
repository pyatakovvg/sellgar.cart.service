import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { connect } from 'amqplib';
import { HealthService } from './health/health.service';
import { AppModule } from './app.module';
import { RpcHttpExceptionFilter } from './common/rpc-http-exception.filter';

export async function createCartApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new RpcHttpExceptionFilter());
  const config = app.get(ConfigService);
  const urls = [
    {
      port: Number(config.get('AMQP_PORT')),
      hostname: config.getOrThrow<string>('AMQP_HOSTNAME'),
      username: config.getOrThrow<string>('AMQP_USERNAME'),
      password: config.getOrThrow<string>('AMQP_PASSWORD'),
    },
  ];
  const eventQueue = config.getOrThrow<string>('AMQP_CART_SRV_EVENT_QUEUE');
  const deadExchange = `${eventQueue}.dead.exchange`;
  const broker = await connect(urls[0]);
  try {
    const channel = await broker.createChannel();
    await channel.assertExchange(deadExchange, 'topic', { durable: true });
    await channel.assertQueue(`${eventQueue}.dead`, { durable: true });
    await channel.bindQueue(`${eventQueue}.dead`, deadExchange, '#');
    await channel.close();
  } finally {
    await broker.close();
  }

  const commands = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls,
        persistent: true,
        queue: config.getOrThrow('AMQP_CART_SRV_COMMAND_QUEUE'),
        queueOptions: { durable: true },
      },
    },
    { inheritAppConfig: true },
  );
  const events = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls,
        persistent: true,
        wildcards: true,
        noAck: false,
        queue: eventQueue,
        queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': deadExchange } },
        exchange: config.getOrThrow('AMQP_EVENTS_EXCHANGE'),
        exchangeType: 'topic',
      },
    },
    { inheritAppConfig: true },
  );
  const health = app.get(HealthService);
  commands.status.subscribe((status) =>
    health.setConsumerConnected('commands', status === 'connected' || status === 'unblocked'),
  );
  events.status.subscribe((status) =>
    health.setConsumerConnected('events', status === 'connected' || status === 'unblocked'),
  );
  await app.init();
  await app.startAllMicroservices();
  Logger.log('Cart service started', 'Bootstrap');
  return app;
}
