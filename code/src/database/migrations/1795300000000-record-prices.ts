import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordPrices1795300000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE accounting_record_snapshot
      ADD COLUMN price_uuid uuid, ADD COLUMN price_value numeric(12,2), ADD COLUMN currency_code varchar(3)`);
    await runner.query(`UPDATE accounting_record_snapshot r SET
      price_uuid=o.price_uuid,price_value=o.price_value,currency_code=o.currency_code
      FROM store_offer_snapshot o WHERE o.uuid=r.offer_uuid`);
    await runner.query(`ALTER TABLE accounting_record_snapshot ADD CONSTRAINT accounting_record_snapshot_price_ck CHECK (
      (price_uuid IS NULL AND price_value IS NULL AND currency_code IS NULL) OR
      (price_uuid IS NOT NULL AND price_value IS NOT NULL AND price_value >= 0 AND currency_code IS NOT NULL)
    )`);
    await runner.query(`ALTER TABLE store_offer_snapshot DROP CONSTRAINT store_offer_snapshot_price_ck,
      DROP COLUMN price_uuid, DROP COLUMN price_value, DROP COLUMN currency_code`);
  }

  async down(): Promise<void> {
    throw new Error('Record prices cannot be merged without losing data. Restore a backup.');
  }
}
