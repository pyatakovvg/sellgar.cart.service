import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('command_request')
export class CommandRequestModel {
  @PrimaryColumn({ name: 'command_id', type: 'uuid' })
  idempotencyKey: string;

  @Column({ name: 'command_type', type: 'text' })
  commandType: string;

  @Column({ name: 'request_hash', type: 'text' })
  requestHash: string;

  @Column({ name: 'result', type: 'jsonb' })
  result: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
