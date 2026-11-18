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

  @Column({ name: 'price_uuid', type: 'uuid', nullable: true })
  priceUuid: string | null;

  @Column({ name: 'price_value', type: 'numeric', precision: 12, scale: 2, nullable: true })
  priceValue: string | null;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode: string | null;
}
