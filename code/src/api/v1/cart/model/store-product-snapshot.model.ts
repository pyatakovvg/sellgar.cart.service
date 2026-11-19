import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('store_product_snapshot')
export class StoreProductSnapshotModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'shop_uuid', type: 'uuid' })
  shopUuid: string;

  @Column({ name: 'product_uuid', type: 'uuid' })
  productUuid: string;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'showing', type: 'boolean' })
  showing: boolean;

  @Column({ name: 'source_version', type: 'integer' })
  sourceVersion: number;
}
