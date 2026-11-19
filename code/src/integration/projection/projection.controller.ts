import { BadRequestException, Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { ProjectionService } from './projection.service';

@Controller()
export class ProjectionController {
  private readonly logger = new Logger(ProjectionController.name);

  constructor(private readonly projections: ProjectionService) {}

  @EventPattern<unknown>([
    'store.product.created',
    'store.product.updated',
    'store.product.archived',
    'store.inventory.updated',
    'product.created',
    'product.updated',
    'shop.created',
    'shop.updated',
  ])
  async apply(@Payload() event: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      await this.projections.apply(event);
      channel.ack(message);
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.error('Rejected source event contract; send to broker dead-letter policy');
        channel.nack(message, false, false);
      } else {
        channel.nack(message, false, true);
      }
    }
  }
}
