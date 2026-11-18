import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GetAllCartsDto {
  @IsOptional() @IsUUID() shopUuid?: string;
  @IsOptional() @IsUUID() ownerUuid?: string;
  @IsOptional() @IsIn(['active', 'closed']) status?: 'active' | 'closed';
  @IsInt() @Min(1) @Max(100) limit = 50;
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) offset = 0;
}

export class GetCartByUuidDto {
  @IsUUID() uuid: string;
}
