import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SourceImageDto {
  @IsUUID() imageUuid: string;
  @IsInt() @Min(0) sortOrder: number;
}

export class SourceVariantDto {
  @IsUUID() uuid: string;
  @IsString() name: string;
  @IsIn(['active', 'archived']) status: string;
  @IsArray()
  @ArrayUnique((v: SourceImageDto) => v.imageUuid)
  @ValidateNested({ each: true })
  @Type(() => SourceImageDto)
  images: SourceImageDto[];
}

export class ProductPayloadDto {
  @IsUUID() uuid: string;
  @IsInt() @Min(1) version: number;
  @IsString() name: string;
  @IsIn(['active', 'archived']) status: string;
  @IsArray()
  @ArrayUnique((v: SourceVariantDto) => v.uuid)
  @ValidateNested({ each: true })
  @Type(() => SourceVariantDto)
  variants: SourceVariantDto[];
}

export class ShopPayloadDto {
  @IsUUID() uuid: string;
  @IsInt() @Min(1) version: number;
  @IsString() name: string;
}

export class InventoryPayloadDto {
  @IsUUID() uuid: string;
  @IsUUID() recordUuid: string;
  @IsInt() @Min(0) @Max(2147483647) quantity: number;
  @IsInt() @Min(0) @Max(2147483647) reserved: number;
  @IsInt() @Min(1) version: number;
}

export class SourceClarificationDto {
  @IsInt() @Min(0) position: number;
  @IsString() value: string;
}

export class SourceRecordDto {
  @IsUUID() uuid: string;
  @IsUUID() offerUuid: string;
  @IsString() article: string;
  @IsArray()
  @ArrayUnique((c: SourceClarificationDto) => c.position)
  @ValidateNested({ each: true })
  @Type(() => SourceClarificationDto)
  clarifications: SourceClarificationDto[];
  @ValidateNested() @Type(() => InventoryPayloadDto) inventory: InventoryPayloadDto;
}

export class SourcePriceDto {
  @IsUUID() uuid: string;
  @IsUUID() offerUuid: string;
  @IsString() @Matches(/^\d{1,10}(\.\d{1,2})?$/) value: string;
  @IsString() @Matches(/^[A-Z]{3}$/) currencyCode: string;
}

export class SourceOfferDto {
  @IsUUID() uuid: string;
  @IsUUID() storeProductUuid: string;
  @IsUUID() productUuid: string;
  @IsUUID() variantUuid: string;
  @IsIn(['active', 'disabled', 'archived']) status: string;
  @IsBoolean() showing: boolean;
  @IsOptional() @ValidateNested() @Type(() => SourcePriceDto) currentPrice: SourcePriceDto | null;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((r: SourceRecordDto) => r.uuid)
  @ValidateNested({ each: true })
  @Type(() => SourceRecordDto)
  records: SourceRecordDto[];
}

export class StorePayloadDto {
  @IsUUID() uuid: string;
  @IsUUID() shopUuid: string;
  @IsUUID() productUuid: string;
  @IsInt() @Min(1) version: number;
  @IsIn(['active', 'disabled', 'archived']) status: string;
  @IsBoolean() showing: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((o: SourceOfferDto) => o.uuid)
  @ValidateNested({ each: true })
  @Type(() => SourceOfferDto)
  offers: SourceOfferDto[];
}
