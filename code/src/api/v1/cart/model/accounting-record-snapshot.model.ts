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
}
