import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sync_issue')
export class SyncIssueModel {
  @PrimaryColumn({ name: 'event_uuid', type: 'uuid' })
  eventUuid: string;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'expected_version', type: 'integer', nullable: true })
  expectedVersion: number | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
