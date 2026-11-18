import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartScopeDto {
  @IsUUID() ownerUuid: string;
  @IsUUID() shopUuid: string;
}

export class CartCommandDto extends CartScopeDto {
  @IsUUID() idempotencyKey: string;
}

export class AddCartItemDto extends CartCommandDto {
  @IsUUID() recordUuid: string;
  @IsInt() @Min(1) @Max(2147483647) quantity: number;
}

export class SetCartItemDto extends AddCartItemDto {
  @IsString() @Matches(/^[1-9]\d*$/) expectedItemVersion: string;
}

export class RemoveCartItemDto extends CartCommandDto {
  @IsUUID() recordUuid: string;
  @IsString() @Matches(/^[1-9]\d*$/) expectedItemVersion: string;
}

export class CheckoutItemDto {
  @IsUUID() recordUuid: string;
  @IsInt() @Min(1) @Max(2147483647) quantity: number;
  @IsString() @Matches(/^[1-9]\d*$/) expectedItemVersion: string;
}

export class CartCheckoutDto extends CartCommandDto {
  @IsUUID() cartUuid: string;
  @IsUUID() checkoutUuid: string;
}

export class PrepareCartDto extends CartCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: CheckoutItemDto) => item.recordUuid)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}

export class CloseOwnerDto {
  @IsUUID() idempotencyKey: string;
  @IsUUID() ownerUuid: string;
}
