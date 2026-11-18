import { randomUUID } from 'node:crypto';
import { ConflictException, Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

import { CartCheckoutService } from '../../api/v1/cart/service/cart-checkout.service';
import { OrderEventsController } from './order-events.controller';

describe('Order completion delivery', () => {
  const complete = jest.fn();
  const controller = new OrderEventsController({ complete } as unknown as CartCheckoutService);
  const channel = { ack: jest.fn(), nack: jest.fn() };
  const message = {};
  const context = new RmqContext([message, channel, 'order.checkout.completed']);
  const event = () => ({
    eventUuid: randomUUID(),
    producer: 'order_srv',
    eventType: 'order.checkout.completed',
    schemaVersion: 1,
    aggregateType: 'checkout',
    aggregateUuid: randomUUID(),
    aggregateVersion: 4,
    occurredAt: new Date().toISOString(),
    payload: { ownerUuid: randomUUID(), shopUuid: randomUUID(), cartUuid: randomUUID() },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    complete.mockReset();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('acknowledges only after completion commits and uses event UUID for deduplication', async () => {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => (entered = resolve));
    complete.mockImplementation(() => {
      entered();
      return new Promise<void>((resolve) => (release = resolve));
    });
    const input = event();
    const delivery = controller.complete(input, context);
    await started;
    expect(channel.ack).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith({
      ...input.payload,
      checkoutUuid: input.aggregateUuid,
      idempotencyKey: input.eventUuid,
    });
    release();
    await delivery;
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it.each([
    { producer: 'store_srv' },
    { schemaVersion: 2 },
    { eventType: 'order.updated' },
    { aggregateType: 'order' },
    { aggregateUuid: 'invalid' },
    { aggregateVersion: 0 },
    { payload: undefined },
    { payload: {} },
    { payload: [] },
  ])('dead-letters invalid completion %j without invoking Cart', async (patch) => {
    await controller.complete({ ...event(), ...patch }, context);
    expect(complete).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('dead-letters a conflicting terminal outcome without acknowledging it', async () => {
    complete.mockRejectedValue(new ConflictException('Checkout has another terminal outcome'));
    await controller.complete(event(), context);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('requeues a transient failure without acknowledging it', async () => {
    complete.mockRejectedValue(new Error('Connection interrupted'));
    await controller.complete(event(), context);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
  });
});
