import { OutboxModuleOptions } from '@sellgar/outbox';

export const CART_OUTBOX_OPTIONS: OutboxModuleOptions = {
  producer: 'cart_srv',
  eventClientToken: 'CART_EVENT_SERVICE',
  aggregateIdField: 'aggregateUuid',
  storage: {
    aggregateIdColumn: 'aggregate_uuid',
    hasProducerColumn: false,
    exhaustedStatus: 'dead',
  },
};
