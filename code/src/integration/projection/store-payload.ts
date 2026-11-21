import { BadRequestException } from '@nestjs/common';
import { IsString, IsUUID, Matches } from 'class-validator';

import { checked } from '../../common/checked';
import { StorePayloadDto } from './source-payload.dto';

class LegacyOfferPrice {
  @IsUUID() uuid: string;
  @IsUUID() offerUuid: string;
  @IsString() @Matches(/^\d{1,10}(\.\d{1,2})?$/) value: string;
  @IsString() @Matches(/^[A-Z]{3}$/) currencyCode: string;
}

type RawOffer = { uuid?: unknown; currentPrice?: unknown; records?: Record<string, unknown>[] };
type RawStore = { offers?: RawOffer[] };

// Owner RPC has no envelope. The offer-level field identifies the previous snapshot format.
export function legacyStoreSnapshot(input: unknown): boolean {
  const offers = (input as RawStore | null)?.offers;
  return (
    Array.isArray(offers) &&
    offers.some(
      (offer) => offer !== null && typeof offer === 'object' && Object.hasOwn(offer, 'currentPrice'),
    )
  );
}

export async function storePayload(input: unknown, legacy: boolean): Promise<StorePayloadDto> {
  if (!legacy) return checked(StorePayloadDto, input);
  const raw = input as RawStore | null;
  if (!raw || !Array.isArray(raw.offers)) throw new BadRequestException('Invalid legacy Store snapshot');
  const offers = [];
  for (const offer of raw.offers) {
    if (!offer || typeof offer !== 'object') throw new BadRequestException('Invalid legacy offer');
    const price = offer.currentPrice == null ? null : await checked(LegacyOfferPrice, offer.currentPrice);
    if (price && price.offerUuid !== offer.uuid)
      throw new BadRequestException('Price belongs to another offer');
    if (!Array.isArray(offer.records)) throw new BadRequestException('Invalid legacy accounting records');
    if (offer.records.some((record) => !record || typeof record !== 'object'))
      throw new BadRequestException('Invalid legacy accounting record');
    offers.push({
      ...offer,
      records: offer.records.map((record) => ({
        ...record,
        currentPrice: price
          ? {
              uuid: price.uuid,
              recordUuid: record.uuid,
              value: price.value,
              currencyCode: price.currencyCode,
            }
          : null,
      })),
    });
  }
  return checked(StorePayloadDto, { ...raw, offers });
}
