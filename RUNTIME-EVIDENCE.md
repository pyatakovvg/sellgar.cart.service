# Cart verification — 2026-11-16

- `yarn build`: passed, independent Cart dependencies installed offline with immutable lockfile.
- `yarn test --runInBand`: 15 tests passed (exact money, authoritative-source checks, Order event validation and acknowledgement/retry policy).
- `yarn test:integration`: 23 PostgreSQL tests passed in a random cart_test_* schema.
- `yarn test:smoke`: passed with actual Store/Product/Shop reads, isolated RabbitMQ exchange/queues and cart_smoke_* schema. Removed command patterns reject requests; cart.get and Order completion/replay work over the broker.
- Prior Store implementation checks: `yarn build` passed. Store `yarn test:integration`: 37 tests passed, including the new record-to-product recovery read.
- Prettier check and TypeScript test typecheck passed.
- Two explicit migrations applied to the new local cart_srv database; exactly 14 application tables plus TypeORM migration metadata.
- Initial local bootstrap: 5 shops, 4 Store Products, 10 accounting records, no unresolved sync issues. Source business data was not mutated.

## Verified outcomes

Owner/shop isolation, concurrent first creation, duplicate and concurrent adds, stock cap and source outage rollback, per-row versions/ABA, unavailable lines retained with exact labels, Product and Shop updates without Store mutations, independent inventory versions, gap/missing-parent recovery, selected-row checkout locks, cancel-before-prepare tombstones, idempotent completion, closure of all owner carts including an owner without previous carts, late guest completion, Order event replay and changed-owner rejection, addressed outbox notifications, concurrent claims and dead-letter rejection of malformed events.

## Integration boundaries

Account owner normalization, Client gateway and private Socket delivery are implemented by the subsequent gateway task. Guest issuance and frontend provider/UI, Order/Payment orchestration and merchant setup remain outside the implementation. Commands are internal trusted RMQ APIs. The separate Cart Git repository has no commit or remote publication; register its parent gitlink together with the first authorized commit/push.

## API cleanup verification

- Projection bootstrap/synchronize remain internal; external RMQ routes and unused DTO were removed.
- cart.get replaces cart.getCurrent without an alias. Existing read/creation semantics are unchanged.
- order.checkout.completed is consumed from the Cart durable event queue. Completion has no RPC route.
- ACK follows the atomic transaction; eventUuid is the durable command_request receipt key. Invalid contracts/conflicts are dead-lettered, transient failures requeued.
- Cart production process restarted from the rebuilt dist; RMQ cart.health returned status=ok, 5 shops loaded, unresolved sync issues=0.
- Order producer is not implemented; the consumer contract is documented in README and the workspace RFC.

## Administrative branch verification

- Admin gateway build passed; all 60 gateway tests passed, including 17 new HTTP branch checks.
- Cart build, 15 unit tests, 23 PostgreSQL integration tests and test typecheck passed.
- Isolated RMQ smoke exercised cart.admin.getAll/getByUuid/item.add/item.setQuantity/item.remove and mutation replay against real source snapshots.
- Administrative reads leave carts/outbox unchanged, include closed cards, and enforce owner/shop/status filters and pagination.
- Administrative commands bind the existing UUID, reuse atomic cart logic and reject stale row versions, excess stock, checkout locks, unknown or closed carts.
- Full gateway AppModule HTTP-to-RMQ-to-PostgreSQL read smoke passed: list 200, unknown card 404, anonymous 401. Only Identity verify was stubbed in the temporary test context; business reads used the running Cart.
- Existing admin gateway watch serves /v1/carts (anonymous 401); Cart restarted with the new administrative handlers.
