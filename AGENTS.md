# @service/cart

Cart owns carts, quantities and its participation in Order checkout. Source: workspace commerce RFC.

- Store owns prices and inventory; Product owns catalog names/status/images; Shop owns shop names.
- Keep exactly the required projection fields. No catalog history or inventory movements.
- ownerUuid comes from verified internal session context; no owner discriminator or public user/session lookup.
- Reads use local projections. Quantity-increasing commands verify authoritative Store stock; checkout reserves belong to Order/Store.
- Explicit migrations; synchronize is disabled.
- Atomic commands/outbox, inbox source version checks, recover gaps from owners.
- Use @sellgar/outbox from library/sellgar.outbox.library for writer, repository, relay, retries, timeouts and metrics. AppModule registers it once with CART_OUTBOX_OPTIONS; CartEventsRepository only builds domain events and passes the current EntityManager to OutboxWriter. Do not recreate local relay/repository implementations. yarn build builds the workspace library first.
- Outbox claim orders each (aggregateType, aggregateUuid) by PostgreSQL aggregate_version, preserving bigint precision. Any lower unpublished version (including backoff, processing or dead) blocks successors; other aggregates continue. Relay drains successive claims within the total batchSize. Verify with yarn test:integration outbox-ordering.
- Closure locks owner, cart mutation locks cart, checkout locks owner then cart. Preserve cancellation tombstones.
- Tests use only random PostgreSQL schemas; never reset public data.
- Two RMQ microservices share one Nest context; no HTTP listen.
- Tests: yarn build; yarn test --runInBand; yarn test:integration; yarn test:smoke.

- Identity integration consumes identity.owner.closed.v1 through the durable event queue and delegates to existing closeOwner. ACK follows commit; eventUuid is the internal deduplication key. Cart does not issue/inspect sessions or determine guest/account types. Provision the consumer binding before the Identity lifecycle publisher.
