import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('inbox_event')
export class InboxEventModel {
  @PrimaryColumn({ name: 'event_uuid', type: 'uuid' })
  eventUuid: string;

  @Column({ name: 'producer', type: 'text' })
  producer: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ name: 'schema_version', type: 'integer' })
  schemaVersion: number;

  @Column({ name: 'aggregate_type', type: 'text' })
  aggregateType: string;

  @Column({ name: 'aggregate_uuid', type: 'uuid' })
  aggregateUuid: string;

  @Column({ name: 'aggregate_version', type: 'integer' })
  aggregateVersion: number;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'attempts', type: 'integer', default: () => '0' })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
