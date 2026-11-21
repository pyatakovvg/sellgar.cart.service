import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';

import { checked } from '../../common/checked';
import { CartEventsRepository } from '../outbox/cart-events.repository';
import { IntegrationEvent, integrationEvent, ProjectionKind, sources } from './integration-event';
import {
  InventoryPayloadDto,
  ProductPayloadDto,
  ShopPayloadDto,
  StorePayloadDto,
} from './source-payload.dto';

import { legacyStoreSnapshot, storePayload } from './store-payload';

type Payload = InventoryPayloadDto | ProductPayloadDto | ShopPayloadDto | StorePayloadDto;
type ApplyResult = 'processed' | 'ignored' | 'parked';

@Injectable()
export class ProjectionService {
  constructor(
    @InjectDataSource() private readonly source: DataSource,
    private readonly events: CartEventsRepository,
  ) {}

  async apply(input: unknown): Promise<ApplyResult> {
    const event = await integrationEvent(input);
    const payload = await this.payload(event.aggregateType, event.payload, event.schemaVersion === 2);
    this.matches(event, payload);

    return this.source.transaction(async (manager) => {
      await this.lock(manager, event.aggregateType, event.aggregateUuid);
      const [existing] = await manager.query('SELECT status FROM inbox_event WHERE event_uuid=$1', [
        event.eventUuid,
      ]);
      if (existing?.status === 'processed' || existing?.status === 'ignored') return 'ignored';
      await manager.query(
        `INSERT INTO inbox_event(event_uuid,producer,event_type,schema_version,aggregate_type,aggregate_uuid,aggregate_version,payload,status,attempts)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received',1)
        ON CONFLICT(event_uuid) DO UPDATE SET attempts=inbox_event.attempts+1`,
        [
          event.eventUuid,
          event.producer,
          event.eventType,
          event.schemaVersion,
          event.aggregateType,
          event.aggregateUuid,
          event.aggregateVersion,
          JSON.stringify(payload),
        ],
      );
      const current = await this.version(manager, event.aggregateType, payload);
      let result: ApplyResult;
      if (event.aggregateVersion > current + 1) {
        await this.park(manager, event, 'version_gap', current + 1);
        result = 'parked';
      } else if (!(await this.parentsReady(manager, event.aggregateType, payload))) {
        await this.park(manager, event, 'missing_parent', null);
        result = 'parked';
      } else {
        const changed = await this.write(manager, event.aggregateType, payload, current);
        result = changed ? 'processed' : 'ignored';
        if (changed) await this.notify(manager, event.aggregateType, payload, event.eventUuid);
        await this.covered(
          manager,
          event.aggregateType,
          event.aggregateUuid,
          Math.max(current, payload.version),
        );
      }
      await manager.query(
        "UPDATE inbox_event SET status=$2,processed_at=CASE WHEN $2='parked' THEN NULL ELSE now() END WHERE event_uuid=$1",
        [event.eventUuid, result],
      );
      return result;
    });
  }

  async synchronize(kind: ProjectionKind, input: unknown): Promise<void> {
    const payload = await this.payload(kind, input, kind === 'store_product' && legacyStoreSnapshot(input));
    await this.source.transaction(async (manager) => {
      await this.lock(manager, kind, payload.uuid);
      if (!(await this.parentsReady(manager, kind, payload)))
        throw new BadRequestException('Authoritative snapshot dependencies are missing');
      const current = await this.version(manager, kind, payload);
      if (await this.write(manager, kind, payload, current, true))
        await this.notify(manager, kind, payload, null);
      await this.covered(manager, kind, payload.uuid, Math.max(current, payload.version));
    });
  }

  private async payload(kind: ProjectionKind, input: unknown, legacy = false): Promise<Payload> {
    // Validate only the fields this consumer needs; the owner retains its full model.
    const payload: Payload =
      kind === 'store_product'
        ? await storePayload(input, legacy)
        : await checked(sources[kind].type as new () => Payload, input);
    if (kind === 'record_inventory') this.inventoryValid(payload as InventoryPayloadDto);
    if (kind === 'store_product') {
      const root = payload as StorePayloadDto;
      const records = new Set<string>();
      for (const offer of root.offers) {
        if (offer.storeProductUuid !== root.uuid || offer.productUuid !== root.productUuid)
          throw new BadRequestException('Offer belongs to another product');
        for (const record of offer.records) {
          if (
            records.has(record.uuid) ||
            record.offerUuid !== offer.uuid ||
            record.inventory?.recordUuid !== record.uuid
          )
            throw new BadRequestException('Record identity mismatch');
          if (record.currentPrice && record.currentPrice.recordUuid !== record.uuid)
            throw new BadRequestException('Price belongs to another accounting record');
          records.add(record.uuid);
          this.inventoryValid(record.inventory);
        }
      }
    }
    return payload;
  }

  private inventoryValid(inventory: InventoryPayloadDto): void {
    if (!inventory || inventory.reserved > inventory.quantity)
      throw new BadRequestException('Invalid inventory');
  }

  private matches(event: IntegrationEvent, payload: Payload): void {
    if (event.aggregateUuid !== payload.uuid || event.aggregateVersion !== payload.version)
      throw new BadRequestException('Envelope and payload identity/version differ');
  }

  private lock(manager: EntityManager, kind: ProjectionKind, uuid: string): Promise<unknown> {
    return manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      `cart-source:${kind}:${uuid}`,
    ]);
  }

  private async version(manager: EntityManager, kind: ProjectionKind, payload: Payload): Promise<number> {
    const tables = {
      shop: 'shop_snapshot',
      product: 'product_snapshot',
      store_product: 'store_product_snapshot',
      record_inventory: 'record_inventory_snapshot',
    };
    const key = kind === 'record_inventory' ? 'record_uuid' : 'uuid';
    const uuid = kind === 'record_inventory' ? (payload as InventoryPayloadDto).recordUuid : payload.uuid;
    const [row] = await manager.query(`SELECT source_version FROM ${tables[kind]} WHERE ${key}=$1`, [uuid]);
    return row?.source_version ?? 0;
  }

  private async parentsReady(
    manager: EntityManager,
    kind: ProjectionKind,
    payload: Payload,
  ): Promise<boolean> {
    if (kind === 'record_inventory') {
      const [record] = await manager.query('SELECT 1 FROM accounting_record_snapshot WHERE uuid=$1', [
        (payload as InventoryPayloadDto).recordUuid,
      ]);
      return Boolean(record);
    }
    if (kind === 'store_product') {
      const product = payload as StorePayloadDto;
      const [ready] = await manager.query(
        `SELECT 1 FROM shop_snapshot sh, product_snapshot p WHERE sh.uuid=$1 AND p.uuid=$2
        AND NOT EXISTS(SELECT 1 FROM unnest($3::uuid[]) wanted(uuid) LEFT JOIN variant_snapshot v ON v.uuid=wanted.uuid AND v.product_uuid=p.uuid WHERE v.uuid IS NULL)`,
        [product.shopUuid, product.productUuid, product.offers.map((o) => o.variantUuid)],
      );
      return Boolean(ready);
    }
    return true;
  }

  private async write(
    manager: EntityManager,
    kind: ProjectionKind,
    payload: Payload,
    current: number,
    authoritative = false,
  ): Promise<boolean> {
    if (kind === 'record_inventory') return this.writeInventory(manager, payload as InventoryPayloadDto);
    if (kind === 'store_product')
      return this.writeStore(manager, payload as StorePayloadDto, current, authoritative);
    if (payload.version <= current) return false;
    if (kind === 'shop') {
      const shop = payload as ShopPayloadDto;
      await manager.query(
        `INSERT INTO shop_snapshot(uuid,name,source_version) VALUES ($1,$2,$3)
        ON CONFLICT(uuid) DO UPDATE SET name=EXCLUDED.name,source_version=EXCLUDED.source_version`,
        [shop.uuid, shop.name, shop.version],
      );
    } else {
      const product = payload as ProductPayloadDto;
      await manager.query(
        `INSERT INTO product_snapshot(uuid,name,status,source_version) VALUES ($1,$2,$3,$4)
        ON CONFLICT(uuid) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,source_version=EXCLUDED.source_version`,
        [product.uuid, product.name, product.status, product.version],
      );
      for (const variant of product.variants) {
        const [other] = await manager.query('SELECT product_uuid FROM variant_snapshot WHERE uuid=$1', [
          variant.uuid,
        ]);
        if (other && other.product_uuid !== product.uuid)
          throw new BadRequestException('Variant identity belongs to another product');
        const image = [...variant.images].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.imageUuid.localeCompare(b.imageUuid),
        )[0];
        await manager.query(
          `INSERT INTO variant_snapshot(uuid,product_uuid,name,status,image_uuid) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT(uuid) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,image_uuid=EXCLUDED.image_uuid`,
          [variant.uuid, product.uuid, variant.name, variant.status, image?.imageUuid ?? null],
        );
      }
      // Keep names of removed variants for existing cart lines.
      await manager.query(
        "UPDATE variant_snapshot SET status='archived' WHERE product_uuid=$1 AND NOT(uuid=ANY($2::uuid[]))",
        [product.uuid, product.variants.map((v) => v.uuid)],
      );
    }
    return true;
  }

  private async writeStore(
    manager: EntityManager,
    product: StorePayloadDto,
    current: number,
    authoritative: boolean,
  ): Promise<boolean> {
    let changed = product.version > current;
    if (changed) {
      const [previous] = await manager.query(
        'SELECT shop_uuid,product_uuid FROM store_product_snapshot WHERE uuid=$1',
        [product.uuid],
      );
      if (
        previous &&
        (previous.shop_uuid !== product.shopUuid || previous.product_uuid !== product.productUuid)
      )
        throw new BadRequestException('Store product identity changed');
      await manager.query(
        `INSERT INTO store_product_snapshot(uuid,shop_uuid,product_uuid,status,showing,source_version) VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT(uuid) DO UPDATE SET status=EXCLUDED.status,showing=EXCLUDED.showing,source_version=EXCLUDED.source_version`,
        [
          product.uuid,
          product.shopUuid,
          product.productUuid,
          product.status,
          product.showing,
          product.version,
        ],
      );
      for (const offer of product.offers) {
        const [previousOffer] = await manager.query(
          'SELECT store_product_uuid,variant_uuid FROM store_offer_snapshot WHERE uuid=$1',
          [offer.uuid],
        );
        if (
          previousOffer &&
          (previousOffer.store_product_uuid !== product.uuid ||
            previousOffer.variant_uuid !== offer.variantUuid)
        )
          throw new BadRequestException('Offer identity changed');
        await manager.query(
          `INSERT INTO store_offer_snapshot(uuid,store_product_uuid,variant_uuid,status,showing)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT(uuid) DO UPDATE SET status=EXCLUDED.status,showing=EXCLUDED.showing`,
          [offer.uuid, product.uuid, offer.variantUuid, offer.status, offer.showing],
        );
        for (const record of offer.records) {
          const [previousRecord] = await manager.query(
            'SELECT offer_uuid FROM accounting_record_snapshot WHERE uuid=$1',
            [record.uuid],
          );
          if (previousRecord && previousRecord.offer_uuid !== offer.uuid)
            throw new BadRequestException('Record identity changed');
          await manager.query(
            `INSERT INTO accounting_record_snapshot(uuid,offer_uuid,article,clarifications,price_uuid,price_value,currency_code) VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT(uuid) DO UPDATE SET article=EXCLUDED.article,clarifications=EXCLUDED.clarifications,price_uuid=EXCLUDED.price_uuid,price_value=EXCLUDED.price_value,currency_code=EXCLUDED.currency_code`,
            [
              record.uuid,
              offer.uuid,
              record.article,
              [...record.clarifications].sort((a, b) => a.position - b.position).map((c) => c.value),
              record.currentPrice?.uuid ?? null,
              record.currentPrice?.value ?? null,
              record.currentPrice?.currencyCode ?? null,
            ],
          );
        }
      }
      // Source snapshots are complete; missing offers remain visible as unavailable rows.
      await manager.query(
        "UPDATE store_offer_snapshot SET status='archived' WHERE store_product_uuid=$1 AND NOT(uuid=ANY($2::uuid[]))",
        [product.uuid, product.offers.map((o) => o.uuid)],
      );
    }
    if (authoritative && product.version === current) {
      // A storage migration can change price identities without changing the domain version.
      // Only an authoritative snapshot may reconcile that same-version projection.
      for (const offer of product.offers) {
        for (const record of offer.records) {
          const price = record.currentPrice;
          const [, affected] = await manager.query(
            `UPDATE accounting_record_snapshot ar SET price_uuid=$3,price_value=$4,currency_code=$5
             FROM store_offer_snapshot o WHERE ar.uuid=$1 AND ar.offer_uuid=$2
             AND o.uuid=ar.offer_uuid AND o.store_product_uuid=$6
             AND (ar.price_uuid,ar.price_value,ar.currency_code) IS DISTINCT FROM ($3::uuid,$4::numeric,$5::varchar)
             RETURNING ar.uuid`,
            [
              record.uuid,
              offer.uuid,
              price?.uuid ?? null,
              price?.value ?? null,
              price?.currencyCode ?? null,
              product.uuid,
            ],
          );
          if (affected > 0) changed = true;
        }
      }
    }
    // Inventory is a separate stream, including in an older Store Product snapshot.
    for (const offer of product.offers) {
      for (const record of [...offer.records].sort((a, b) => a.uuid.localeCompare(b.uuid))) {
        const [known] = await manager.query(
          'SELECT 1 FROM accounting_record_snapshot WHERE uuid=$1 AND offer_uuid=$2',
          [record.uuid, offer.uuid],
        );
        if (known && (await this.writeInventory(manager, record.inventory))) changed = true;
      }
    }
    return changed;
  }

  private async writeInventory(manager: EntityManager, inventory: InventoryPayloadDto): Promise<boolean> {
    await this.lock(manager, 'record_inventory', inventory.uuid);
    const current = await this.version(manager, 'record_inventory', inventory);
    if (inventory.version <= current) return false;
    await manager.query(
      `INSERT INTO record_inventory_snapshot(record_uuid,available,source_version) VALUES ($1,$2,$3)
      ON CONFLICT(record_uuid) DO UPDATE SET available=EXCLUDED.available,source_version=EXCLUDED.source_version`,
      [inventory.recordUuid, inventory.quantity - inventory.reserved, inventory.version],
    );
    await this.covered(manager, 'record_inventory', inventory.uuid, inventory.version);
    return true;
  }

  private async park(
    manager: EntityManager,
    event: IntegrationEvent,
    reason: string,
    expected: number | null,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO sync_issue(event_uuid,reason,expected_version) VALUES ($1,$2,$3)
      ON CONFLICT(event_uuid) DO UPDATE SET reason=EXCLUDED.reason,expected_version=EXCLUDED.expected_version,resolved_at=NULL`,
      [event.eventUuid, reason, expected],
    );
  }

  private async covered(
    manager: EntityManager,
    kind: ProjectionKind,
    uuid: string,
    version: number,
  ): Promise<void> {
    const producer = sources[kind].producer;
    await manager.query(
      `UPDATE sync_issue si SET resolved_at=now() FROM inbox_event ie
      WHERE si.event_uuid=ie.event_uuid AND si.resolved_at IS NULL AND ie.producer=$1 AND ie.aggregate_type=$2 AND ie.aggregate_uuid=$3 AND ie.aggregate_version<=$4`,
      [producer, kind, uuid, version],
    );
    await manager.query(
      `UPDATE inbox_event SET status='ignored',processed_at=now() WHERE producer=$1 AND aggregate_type=$2 AND aggregate_uuid=$3 AND aggregate_version<=$4 AND status='parked'`,
      [producer, kind, uuid, version],
    );
  }

  private async notify(
    manager: EntityManager,
    kind: ProjectionKind,
    payload: Payload,
    eventUuid: string | null,
  ): Promise<void> {
    const column = {
      shop: 'c.shop_uuid',
      product: 'sp.product_uuid',
      store_product: 'sp.uuid',
      record_inventory: 'ci.record_uuid',
    }[kind];
    const uuid = kind === 'record_inventory' ? (payload as InventoryPayloadDto).recordUuid : payload.uuid;
    const targets: { uuid: string; owner_uuid: string; shop_uuid: string }[] = await manager.query(
      `SELECT DISTINCT c.uuid,c.owner_uuid,c.shop_uuid FROM carts c
      LEFT JOIN cart_items ci ON ci.cart_uuid=c.uuid LEFT JOIN accounting_record_snapshot ar ON ar.uuid=ci.record_uuid
      LEFT JOIN store_offer_snapshot o ON o.uuid=ar.offer_uuid LEFT JOIN store_product_snapshot sp ON sp.uuid=o.store_product_uuid
      WHERE c.closed_at IS NULL AND ${column}=$1`,
      [uuid],
    );
    if (!targets.length) return;
    // One durable source notification carries server-only targets, never a public cart broadcast.
    await this.events.write(
      manager,
      'cart.projection.updated',
      `cart_projection_${kind}`,
      payload.uuid,
      payload.version,
      {
        source: {
          producer: sources[kind].producer,
          aggregateType: kind,
          aggregateUuid: payload.uuid,
          version: payload.version,
          eventUuid,
        },
        targets: targets.map((t) => ({ cartUuid: t.uuid, ownerUuid: t.owner_uuid, shopUuid: t.shop_uuid })),
      },
    );
  }
}
