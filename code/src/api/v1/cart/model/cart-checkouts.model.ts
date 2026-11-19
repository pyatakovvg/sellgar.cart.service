import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cart_checkouts')
export class CartCheckoutModel {
  @PrimaryColumn({ name: 'checkout_uuid', type: 'uuid' })
  checkoutUuid: string;

  @Column({ name: 'cart_uuid', type: 'uuid' })
  cartUuid: string;

  @Column({ name: 'request_hash', type: 'text', nullable: true })
  requestHash: string | null;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
