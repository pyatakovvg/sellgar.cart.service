import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
if (existsSync('.env')) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync('.env', 'utf8')))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
import { DataSource } from 'typeorm';
import { CartDatabaseOptions } from '../src/database/cart-database.options';
import { RecordPrices1795300000000 } from '../src/database/migrations/1795300000000-record-prices';

describe('Existing Cart price projection migration', () => {
  const schema = `cart_price_test_${randomUUID().replace(/-/g, '')}`;
  let source: DataSource;

  beforeAll(async () => {
    source = await new DataSource({
      ...CartDatabaseOptions.create({ ...process.env, CART_DATABASE_SCHEMA: schema }),
      entities: [],
      migrations: [],
    }).initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
    await source.query(`CREATE TABLE store_offer_snapshot(uuid uuid PRIMARY KEY, price_uuid uuid, price_value numeric(12,2), currency_code varchar(3),
      CONSTRAINT store_offer_snapshot_price_ck CHECK ((price_uuid IS NULL AND price_value IS NULL AND currency_code IS NULL) OR
      (price_uuid IS NOT NULL AND price_value IS NOT NULL AND currency_code IS NOT NULL)))`);
    await source.query(
      'CREATE TABLE accounting_record_snapshot(uuid uuid PRIMARY KEY,offer_uuid uuid REFERENCES store_offer_snapshot(uuid),article text,clarifications text[])',
    );
    await source.query('CREATE TABLE cart_items(record_uuid uuid,quantity integer)');
  });

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.query(`DROP SCHEMA "${schema}" CASCADE`);
      await source.destroy();
    }
  });

  it('copies both complete and absent prices while preserving existing cart quantities', async () => {
    const offer = randomUUID(),
      emptyOffer = randomUUID(),
      price = randomUUID();
    const records = [randomUUID(), randomUUID(), randomUUID()];
    await source.query("INSERT INTO store_offer_snapshot VALUES ($1,$2,'125.50','RUB'),($3,NULL,NULL,NULL)", [
      offer,
      price,
      emptyOffer,
    ]);
    for (const [index, record] of records.entries()) {
      await source.query("INSERT INTO accounting_record_snapshot VALUES ($1,$2,'SKU',ARRAY[]::text[])", [
        record,
        index === 2 ? emptyOffer : offer,
      ]);
      await source.query('INSERT INTO cart_items VALUES ($1,$2)', [record, index + 1]);
    }
    const runner = source.createQueryRunner();
    await runner.startTransaction();
    try {
      await new RecordPrices1795300000000().up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    for (const record of records.slice(0, 2)) {
      expect(
        (await source.query('SELECT * FROM accounting_record_snapshot WHERE uuid=$1', [record]))[0],
      ).toMatchObject({ price_uuid: price, price_value: '125.50', currency_code: 'RUB' });
    }
    expect(
      (await source.query('SELECT * FROM accounting_record_snapshot WHERE uuid=$1', [records[2]]))[0],
    ).toMatchObject({ price_uuid: null, price_value: null, currency_code: null });
    expect(await source.query('SELECT * FROM cart_items ORDER BY quantity')).toEqual(
      records.map((record, index) => ({ record_uuid: record, quantity: index + 1 })),
    );
  });
});
