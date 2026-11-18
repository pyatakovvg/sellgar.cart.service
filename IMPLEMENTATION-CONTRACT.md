# Cart implementation contract

- Source: user request 2026-11-16, commerce RFC in workspace agent/docs.
- Goal: independent NestJS/RMQ Cart service, one active cart per ownerUuid/shopUuid.
- Branch: master; feature code belongs to this repository, not workspace root.
- In scope: explicit migration of 14 tables, projection consumers and recovery, cart commands, checkout participation, durable events, PostgreSQL and RMQ acceptance.
- Store impact: authoritative Store Product read by accounting record UUID.
- Out of scope: storefront/admin UI, Order/Payment implementation, new auth/session implementation, commit/push.
- Existing consumers: Identity does not issue normalized guest ownerUuid yet; private Socket audience is not implemented. Cart exposes internal trusted RMQ contracts and outgoing events for those consumers.
- Acceptance: migration, no cross-shop/owner access, idempotent atomic changes, stock cap, unavailable rows retained, source versions/recovery, selected-row locks and cancellation tombstones, private owner targets on view notifications, real PostgreSQL and RMQ smoke.
- Local dependencies: standalone Yarn 4 installation from existing offline Store cache, immutable lockfile; no shared node_modules or source modifications.
- Repository registration: independent local Git checkout; remote publication and parent gitlink registration require the first requested commit/push.

## API cleanup — 2026-11-16

- Authorized by: user «исправляй» after API audit.
- Scope: rename cart.getCurrent to cart.get; remove projection bootstrap/synchronize RMQ commands; consume Order checkout completion as an event instead of an RPC command.
- Preserve: internal bootstrap/recovery, checkout locks/cancellation, owner closure, health and existing read semantics.
- Order does not exist yet: define its required completion event contract explicitly; do not claim producer integration.
- Acceptance: build, unit/PG tests, isolated real RMQ event completion/replay/dead-letter smoke; no old command consumers left.

## Admin gateway branch — 2026-11-16

- Authorized by: user requested a separate admin gateway API branch and selected «Просмотр и изменение состава».
- Scope: gateway cart_srv/v1, list/card plus add/set/remove for existing carts; matching Cart administrative RPC/query adapters.
- Preserve: customer cart.get semantics, owner normalization, checkout boundaries, atomic outbox and source projections.
- No customer owner spoofing or cart creation through admin mutation; owner/shop are resolved in Cart by immutable cartUuid.
- Acceptance: HTTP validation/auth boundary/response mapping, PostgreSQL no-write reads and mutation invariants, actual RMQ smoke, both builds and runtime readiness.
