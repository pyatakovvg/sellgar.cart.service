import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('product_snapshot')
export class ProductSnapshotModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'source_version', type: 'integer' })
  sourceVersion: number;
}
