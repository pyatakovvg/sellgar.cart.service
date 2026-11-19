import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('outbox_event')
export class OutboxEventModel {
  @PrimaryColumn({ name: 'uuid', type: 'uuid' })
  uuid: string;

  @Column({ name: 'aggregate_type', type: 'text' })
  aggregateType: string;

  @Column({ name: 'aggregate_uuid', type: 'uuid' })
  aggregateUuid: string;

  @Column({ name: 'aggregate_version', type: 'bigint' })
  aggregateVersion: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ name: 'schema_version', type: 'integer', default: () => '1' })
  schemaVersion: number;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;

  @Column({ name: 'status', type: 'text', default: () => "'pending'" })
  status: string;

  @Column({ name: 'attempts', type: 'integer', default: () => '0' })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true, default: () => 'now()' })
  nextAttemptAt: Date | null;

  @Column({ name: 'processing_started_at', type: 'timestamptz', nullable: true })
  processingStartedAt: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;
}
