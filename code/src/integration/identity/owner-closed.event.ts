import { Equals, IsISO8601, IsString, IsUUID } from 'class-validator';

export class OwnerClosedEvent {
  @IsUUID()
  eventUuid: string;

  @Equals('identity.owner.closed.v1')
  eventType: string;

  @Equals(1)
  schemaVersion: number;

  @Equals('identity_srv')
  producer: string;

  @IsUUID()
  ownerUuid: string;

  @IsISO8601()
  occurredAt: string;

  @IsString()
  reason: string;
}
