import { CartView } from './cart-view.entity';

export interface CartAdminMetadata {
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CartAdminSummary extends CartAdminMetadata {
  uuid: string;
  ownerUuid: string;
  version: string;
  shop: { uuid: string; name: string | null };
  itemsCount: number;
}

export interface CartAdminView extends CartView, CartAdminMetadata {}

export interface CartAdminPage {
  data: CartAdminSummary[];
  meta: { totalRows: number; limit: number; offset: number };
}
