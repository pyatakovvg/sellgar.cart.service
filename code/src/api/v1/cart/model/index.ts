import { CartModel } from './carts.model';
import { CartItemModel } from './cart-items.model';
import { CartCheckoutModel } from './cart-checkouts.model';
import { ShopSnapshotModel } from './shop-snapshot.model';
import { ProductSnapshotModel } from './product-snapshot.model';
import { VariantSnapshotModel } from './variant-snapshot.model';
import { StoreProductSnapshotModel } from './store-product-snapshot.model';
import { StoreOfferSnapshotModel } from './store-offer-snapshot.model';
import { AccountingRecordSnapshotModel } from './accounting-record-snapshot.model';
import { RecordInventorySnapshotModel } from './record-inventory-snapshot.model';
import { CommandRequestModel } from './command-request.model';
import { InboxEventModel } from './inbox-event.model';
import { OutboxEventModel } from './outbox-event.model';
import { SyncIssueModel } from './sync-issue.model';

export const CART_MODELS = [
  CartModel,
  CartItemModel,
  CartCheckoutModel,
  ShopSnapshotModel,
  ProductSnapshotModel,
  VariantSnapshotModel,
  StoreProductSnapshotModel,
  StoreOfferSnapshotModel,
  AccountingRecordSnapshotModel,
  RecordInventorySnapshotModel,
  CommandRequestModel,
  InboxEventModel,
  OutboxEventModel,
  SyncIssueModel,
];
