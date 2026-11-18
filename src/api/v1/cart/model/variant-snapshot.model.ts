import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('variant_snapshot')
export class VariantSnapshotModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'product_uuid', type: 'uuid' })
  productUuid: string;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'image_uuid', type: 'uuid', nullable: true })
  imageUuid: string | null;
}
