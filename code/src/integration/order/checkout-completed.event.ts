import { Type } from 'class-transformer';
import { Equals, IsDefined, IsInt, IsISO8601, IsObject, IsUUID, Min, ValidateNested } from 'class-validator';

import { CartScopeDto } from '../../api/v1/cart/controller/dto/cart.dto';

class CheckoutCompletedPayload extends CartScopeDto {
  @IsUUID() cartUuid: string;
}

export class CheckoutCompletedEvent {
  @IsUUID() eventUuid: string;
  @Equals('order_srv') producer: string;
  @Equals('order.checkout.completed') eventType: string;
  @Equals('checkout') aggregateType: string;
  @IsUUID() aggregateUuid: string;
  @IsInt() @Min(1) aggregateVersion: number;
  @Equals(1) schemaVersion: number;
  @IsISO8601() occurredAt: string;
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CheckoutCompletedPayload)
  payload: CheckoutCompletedPayload;
}
