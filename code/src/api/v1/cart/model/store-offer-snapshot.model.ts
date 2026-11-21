import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('store_offer_snapshot')
export class StoreOfferSnapshotModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'store_product_uuid', type: 'uuid' })
  storeProductUuid: string;

  @Column({ name: 'variant_uuid', type: 'uuid' })
  variantUuid: string;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'showing', type: 'boolean' })
  showing: boolean;
}
