import { IsInt, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

class CartAdminCommandDto {
  @IsUUID() idempotencyKey: string;
  @IsUUID() cartUuid: string;
  @IsUUID() recordUuid: string;
}

export class AdminAddCartItemDto extends CartAdminCommandDto {
  @IsInt() @Min(1) @Max(2147483647) quantity: number;
}

export class AdminSetCartItemDto extends AdminAddCartItemDto {
  @IsString() @Matches(/^[1-9]\d*$/) expectedItemVersion: string;
}

export class AdminRemoveCartItemDto extends CartAdminCommandDto {
  @IsString() @Matches(/^[1-9]\d*$/) expectedItemVersion: string;
}
