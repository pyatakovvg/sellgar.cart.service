import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('shop_snapshot')
export class ShopSnapshotModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'source_version', type: 'integer' })
  sourceVersion: number;
}
