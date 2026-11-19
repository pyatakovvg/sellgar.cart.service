import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCart1794830000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE carts (
  uuid uuid NOT NULL,
  shop_uuid uuid NOT NULL,
  owner_uuid uuid NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE cart_items (
  cart_uuid uuid NOT NULL,
  record_uuid uuid NOT NULL,
  quantity integer NOT NULL,
  version bigint NOT NULL,
  checkout_uuid uuid,
  PRIMARY KEY (cart_uuid, record_uuid)
)`);
    await queryRunner.query(`CREATE TABLE cart_checkouts (
  checkout_uuid uuid NOT NULL,
  cart_uuid uuid NOT NULL,
  request_hash text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (checkout_uuid)
)`);
    await queryRunner.query(`CREATE TABLE shop_snapshot (
  uuid uuid NOT NULL,
  name text NOT NULL,
  source_version integer NOT NULL,
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE product_snapshot (
  uuid uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  source_version integer NOT NULL,
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE variant_snapshot (
  uuid uuid NOT NULL,
  product_uuid uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  image_uuid uuid,
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE store_product_snapshot (
  uuid uuid NOT NULL,
  shop_uuid uuid NOT NULL,
  product_uuid uuid NOT NULL,
  status text NOT NULL,
  showing boolean NOT NULL,
  source_version integer NOT NULL,
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE store_offer_snapshot (
  uuid uuid NOT NULL,
  store_product_uuid uuid NOT NULL,
  variant_uuid uuid NOT NULL,
  status text NOT NULL,
  showing boolean NOT NULL,
  price_uuid uuid,
  price_value numeric(12,2),
  currency_code varchar(3),
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE accounting_record_snapshot (
  uuid uuid NOT NULL,
  offer_uuid uuid NOT NULL,
  article text NOT NULL,
  clarifications text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE record_inventory_snapshot (
  record_uuid uuid NOT NULL,
  available integer NOT NULL,
  source_version integer NOT NULL,
  PRIMARY KEY (record_uuid)
)`);
    await queryRunner.query(`CREATE TABLE command_request (
  command_id uuid NOT NULL,
  command_type text NOT NULL,
  request_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (command_id)
)`);
    await queryRunner.query(`CREATE TABLE inbox_event (
  event_uuid uuid NOT NULL,
  producer text NOT NULL,
  event_type text NOT NULL,
  schema_version integer NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_uuid uuid NOT NULL,
  aggregate_version integer NOT NULL,
  payload jsonb,
  status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (event_uuid)
)`);
    await queryRunner.query(`CREATE TABLE outbox_event (
  uuid uuid NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_uuid uuid NOT NULL,
  aggregate_version bigint NOT NULL,
  event_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz DEFAULT now(),
  processing_started_at timestamptz,
  published_at timestamptz,
  last_error text,
  PRIMARY KEY (uuid)
)`);
    await queryRunner.query(`CREATE TABLE sync_issue (
  event_uuid uuid NOT NULL,
  reason text NOT NULL,
  expected_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  PRIMARY KEY (event_uuid)
)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX carts_active_owner_shop_uq ON carts(owner_uuid, shop_uuid) WHERE closed_at IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX carts_owner_idx ON carts(owner_uuid)`);
    await queryRunner.query(
      `ALTER TABLE cart_checkouts ADD CONSTRAINT cart_checkouts_cart_fk FOREIGN KEY (cart_uuid) REFERENCES carts(uuid)`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_checkouts ADD CONSTRAINT cart_checkouts_cart_checkout_uq UNIQUE (cart_uuid, checkout_uuid)`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_fk FOREIGN KEY (cart_uuid) REFERENCES carts(uuid)`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_items ADD CONSTRAINT cart_items_checkout_fk FOREIGN KEY (cart_uuid, checkout_uuid) REFERENCES cart_checkouts(cart_uuid, checkout_uuid)`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_ck CHECK (quantity > 0)`,
    );
    await queryRunner.query(`ALTER TABLE carts ADD CONSTRAINT carts_version_ck CHECK (version >= 0)`);
    await queryRunner.query(
      `ALTER TABLE cart_items ADD CONSTRAINT cart_items_version_ck CHECK (version > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_checkouts ADD CONSTRAINT cart_checkouts_status_ck CHECK (status IN ('prepared','completed','cancelled'))`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_checkouts ADD CONSTRAINT cart_checkouts_result_ck CHECK ((status='prepared' AND request_hash IS NOT NULL AND finished_at IS NULL) OR (status IN ('completed','cancelled') AND finished_at IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE product_snapshot ADD CONSTRAINT product_snapshot_status_ck CHECK (status IN ('active','archived'))`,
    );
    await queryRunner.query(
      `ALTER TABLE variant_snapshot ADD CONSTRAINT variant_snapshot_status_ck CHECK (status IN ('active','archived'))`,
    );
    await queryRunner.query(
      `ALTER TABLE store_product_snapshot ADD CONSTRAINT store_product_snapshot_status_ck CHECK (status IN ('active','disabled','archived'))`,
    );
    await queryRunner.query(
      `ALTER TABLE store_offer_snapshot ADD CONSTRAINT store_offer_snapshot_status_ck CHECK (status IN ('active','disabled','archived'))`,
    );
    await queryRunner.query(
      `ALTER TABLE store_offer_snapshot ADD CONSTRAINT store_offer_snapshot_price_ck CHECK ((price_uuid IS NULL AND price_value IS NULL AND currency_code IS NULL) OR (price_uuid IS NOT NULL AND price_value >= 0 AND currency_code IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE record_inventory_snapshot ADD CONSTRAINT record_inventory_snapshot_available_ck CHECK (available >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE sync_issue ADD CONSTRAINT sync_issue_inbox_fk FOREIGN KEY (event_uuid) REFERENCES inbox_event(event_uuid)`,
    );
    await queryRunner.query(`CREATE INDEX cart_items_record_idx ON cart_items(record_uuid)`);
    await queryRunner.query(
      `CREATE INDEX cart_items_checkout_idx ON cart_items(checkout_uuid) WHERE checkout_uuid IS NOT NULL`,
    );
    await queryRunner.query(`CREATE INDEX variant_snapshot_product_idx ON variant_snapshot(product_uuid)`);
    await queryRunner.query(
      `CREATE INDEX store_product_snapshot_product_idx ON store_product_snapshot(product_uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX store_product_snapshot_shop_idx ON store_product_snapshot(shop_uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX store_offer_snapshot_parent_idx ON store_offer_snapshot(store_product_uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX accounting_record_snapshot_offer_idx ON accounting_record_snapshot(offer_uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX outbox_event_publish_idx ON outbox_event(status,next_attempt_at,occurred_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX sync_issue_open_idx ON sync_issue(created_at) WHERE resolved_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX inbox_event_source_idx ON inbox_event(producer,aggregate_type,aggregate_uuid,aggregate_version)`,
    );
    await queryRunner.query(
      `CREATE INDEX command_request_closed_owner_idx ON command_request((result->>'ownerUuid')) WHERE command_type='cart.owner.close'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE sync_issue CASCADE');
    await queryRunner.query('DROP TABLE outbox_event CASCADE');
    await queryRunner.query('DROP TABLE inbox_event CASCADE');
    await queryRunner.query('DROP TABLE command_request CASCADE');
    await queryRunner.query('DROP TABLE record_inventory_snapshot CASCADE');
    await queryRunner.query('DROP TABLE accounting_record_snapshot CASCADE');
    await queryRunner.query('DROP TABLE store_offer_snapshot CASCADE');
    await queryRunner.query('DROP TABLE store_product_snapshot CASCADE');
    await queryRunner.query('DROP TABLE variant_snapshot CASCADE');
    await queryRunner.query('DROP TABLE product_snapshot CASCADE');
    await queryRunner.query('DROP TABLE shop_snapshot CASCADE');
    await queryRunner.query('DROP TABLE cart_checkouts CASCADE');
    await queryRunner.query('DROP TABLE cart_items CASCADE');
    await queryRunner.query('DROP TABLE carts CASCADE');
  }
}
