import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cart_items')
export class CartItemModel {
  @PrimaryColumn({ name: 'cart_uuid', type: 'uuid' })
  cartUuid: string;

  @PrimaryColumn({ name: 'record_uuid', type: 'uuid' })
  recordUuid: string;

  @Column({ name: 'quantity', type: 'integer' })
  quantity: number;

  @Column({ name: 'version', type: 'bigint' })
  version: string;

  @Column({ name: 'checkout_uuid', type: 'uuid', nullable: true })
  checkoutUuid: string | null;
}
