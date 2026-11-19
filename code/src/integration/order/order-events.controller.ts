import { Controller, HttpException, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { CartCheckoutService } from '../../api/v1/cart/service/cart-checkout.service';
import { checked } from '../../common/checked';
import { CheckoutCompletedEvent } from './checkout-completed.event';

@Controller()
export class OrderEventsController {
  private readonly logger = new Logger(OrderEventsController.name);

  constructor(private readonly checkouts: CartCheckoutService) {}

  @EventPattern<unknown>('order.checkout.completed')
  async complete(@Payload() input: unknown, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      const event = await checked(CheckoutCompletedEvent, input);
      await this.checkouts.complete({
        ...event.payload,
        checkoutUuid: event.aggregateUuid,
        idempotencyKey: event.eventUuid,
      });
      channel.ack(message);
    } catch (error) {
      const permanent = error instanceof HttpException && [400, 404, 409].includes(error.getStatus());
      if (permanent) this.logger.error('Rejected Order completion; send to broker dead-letter policy');
      channel.nack(message, false, !permanent);
    }
  }
}
