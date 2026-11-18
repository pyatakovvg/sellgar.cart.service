import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireCompletePrice1794830001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE store_offer_snapshot DROP CONSTRAINT store_offer_snapshot_price_ck');
    await queryRunner.query(`ALTER TABLE store_offer_snapshot ADD CONSTRAINT store_offer_snapshot_price_ck CHECK (
      (price_uuid IS NULL AND price_value IS NULL AND currency_code IS NULL) OR
      (price_uuid IS NOT NULL AND price_value IS NOT NULL AND price_value >= 0 AND currency_code IS NOT NULL)
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE store_offer_snapshot DROP CONSTRAINT store_offer_snapshot_price_ck');
    await queryRunner.query(`ALTER TABLE store_offer_snapshot ADD CONSTRAINT store_offer_snapshot_price_ck CHECK (
      (price_uuid IS NULL AND price_value IS NULL AND currency_code IS NULL) OR
      (price_uuid IS NOT NULL AND price_value >= 0 AND currency_code IS NOT NULL)
    )`);
  }
}
