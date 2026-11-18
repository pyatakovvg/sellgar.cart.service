import { Controller, HttpException, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { CartService } from '../../api/v1/cart/service/cart.service';
import { checked } from '../../common/checked';
import { OwnerClosedEvent } from './owner-closed.event';

@Controller()
export class IdentityEventsController {
  private readonly logger = new Logger(IdentityEventsController.name);

  constructor(private readonly carts: CartService) {}

  @EventPattern<unknown>('identity.owner.closed.v1')
  async closeOwner(@Payload() input: unknown, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      const event = await checked(OwnerClosedEvent, input);
      await this.carts.closeOwner({ ownerUuid: event.ownerUuid, idempotencyKey: event.eventUuid });
      channel.ack(message);
    } catch (error) {
      const permanent = error instanceof HttpException && [400, 404, 409].includes(error.getStatus());
      if (permanent) this.logger.error('Rejected Identity owner closure; send to dead-letter queue');
      channel.nack(message, false, !permanent);
    }
  }
}
