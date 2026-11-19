export interface CartRow {
  uuid: string;
  owner_uuid: string;
  shop_uuid: string;
  version: string;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export interface CartLineRow {
  record_uuid: string;
  quantity: number;
  version: string;
  checkout_uuid: string | null;
  record_exists: boolean;
  article: string | null;
  clarifications: string[] | null;
  offer_uuid: string | null;
  store_product_uuid: string | null;
  product_uuid: string | null;
  variant_uuid: string | null;
  product_name: string | null;
  variant_name: string | null;
  image_uuid: string | null;
  product_status: string | null;
  variant_status: string | null;
  store_product_status: string | null;
  offer_status: string | null;
  product_showing: boolean | null;
  offer_showing: boolean | null;
  price_uuid: string | null;
  price_value: string | null;
  currency_code: string | null;
  available: number | null;
  shop_uuid: string | null;
  shop_name: string | null;
  shop_version: number | null;
  product_version: number | null;
  store_version: number | null;
  inventory_version: number | null;
  sync_pending: boolean;
}

export type Unavailability =
  | 'not_sold'
  | 'hidden'
  | 'sync_pending'
  | 'price_missing'
  | 'currency_mismatch'
  | 'out_of_stock'
  | 'insufficient_stock'
  | 'checkout_in_progress';

export interface CartItemView {
  recordUuid: string;
  offerUuid: string | null;
  productUuid: string | null;
  variantUuid: string | null;
  productName: string | null;
  variantName: string | null;
  article: string | null;
  clarifications: string[];
  imageUuid: string | null;
  quantity: number;
  version: string;
  checkoutUuid: string | null;
  available: number | null;
  price: { uuid: string; value: string; currencyCode: string } | null;
  subtotal: string | null;
  reasons: Unavailability[];
  message: string | null;
  canCheckout: boolean;
  canOpenProduct: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  canRemove: boolean;
  sourceVersions: { product: number | null; store: number | null; inventory: number | null };
}

export interface CartView {
  uuid: string;
  ownerUuid: string;
  version: string;
  shop: { uuid: string; name: string | null; sourceVersion: number | null };
  items: CartItemView[];
  currencyCode: string;
  itemsTotal: string | null;
}
