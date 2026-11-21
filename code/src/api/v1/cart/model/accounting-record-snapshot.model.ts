import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('accounting_record_snapshot')
export class AccountingRecordSnapshotModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'offer_uuid', type: 'uuid' })
  offerUuid: string;

  @Column({ name: 'article', type: 'text' })
  article: string;

  @Column({ name: 'clarifications', type: 'text', array: true, default: () => "'{}'" })
  clarifications: string[];
  @Column({ name: 'price_uuid', type: 'uuid', nullable: true })
  priceUuid: string | null;

  @Column({ name: 'price_value', type: 'numeric', precision: 12, scale: 2, nullable: true })
  priceValue: string | null;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode: string | null;
}
