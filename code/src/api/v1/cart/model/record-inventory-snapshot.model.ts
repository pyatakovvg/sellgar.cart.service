import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('record_inventory_snapshot')
export class RecordInventorySnapshotModel {
  @PrimaryColumn({ name: 'record_uuid', type: 'uuid' })
  recordUuid: string;

  @Column({ name: 'available', type: 'integer' })
  available: number;

  @Column({ name: 'source_version', type: 'integer' })
  sourceVersion: number;
}
