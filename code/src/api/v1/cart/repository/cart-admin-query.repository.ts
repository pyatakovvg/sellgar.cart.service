import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { GetAllCartsDto } from '../controller/dto/get-all-carts.dto';
import { CartAdminMetadata, CartAdminPage, CartAdminView } from '../entity/cart-admin.entity';
import { CartRow } from '../entity/cart-view.entity';
import { CartQueryRepository } from './cart-query.repository';
import { CartScopeDto } from '../controller/dto/cart.dto';

@Injectable()
export class CartAdminQueryRepository {
  constructor(private readonly queries: CartQueryRepository) {}

  async getAll(manager: EntityManager, query: GetAllCartsDto): Promise<CartAdminPage> {
    const parameters = [query.shopUuid ?? null, query.ownerUuid ?? null, query.status ?? null];
    const where = `WHERE ($1::uuid IS NULL OR c.shop_uuid=$1)
      AND ($2::uuid IS NULL OR c.owner_uuid=$2)
      AND ($3::text IS NULL OR (c.closed_at IS NULL AND $3='active') OR (c.closed_at IS NOT NULL AND $3='closed'))`;
    const [count] = await manager.query(`SELECT count(*)::int AS total FROM carts c ${where}`, parameters);
    const records: (CartRow & { shop_name: string | null; items_count: number })[] = await manager.query(
      `SELECT c.*, sh.name AS shop_name,
      (SELECT count(*)::int FROM cart_items ci WHERE ci.cart_uuid=c.uuid) AS items_count
      FROM carts c LEFT JOIN shop_snapshot sh ON sh.uuid=c.shop_uuid ${where}
      ORDER BY c.updated_at DESC,c.uuid LIMIT $4 OFFSET $5`,
      [...parameters, query.limit, query.offset],
    );
    return {
      data: records.map((row) => ({
        uuid: row.uuid,
        ownerUuid: row.owner_uuid,
        version: row.version,
        shop: { uuid: row.shop_uuid, name: row.shop_name },
        itemsCount: row.items_count,
        ...this.metadata(row),
      })),
      meta: { totalRows: count.total, limit: query.limit, offset: query.offset },
    };
  }

  async getByUuid(manager: EntityManager, uuid: string): Promise<CartAdminView> {
    const [cart]: CartRow[] = await manager.query('SELECT * FROM carts WHERE uuid=$1', [uuid]);
    if (!cart) throw new NotFoundException('Cart not found');
    const view = await this.queries.view(manager, cart);
    if (cart.closed_at) {
      view.items = view.items.map((item) => ({
        ...item,
        canCheckout: false,
        canIncrease: false,
        canDecrease: false,
        canRemove: false,
      }));
    }
    return { ...view, ...this.metadata(cart) };
  }

  async scope(manager: EntityManager, uuid: string): Promise<CartScopeDto> {
    const [cart]: Pick<CartRow, 'owner_uuid' | 'shop_uuid'>[] = await manager.query(
      'SELECT owner_uuid,shop_uuid FROM carts WHERE uuid=$1',
      [uuid],
    );
    if (!cart) throw new NotFoundException('Cart not found');
    return { ownerUuid: cart.owner_uuid, shopUuid: cart.shop_uuid };
  }

  private metadata(row: CartRow): CartAdminMetadata {
    return {
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      closedAt: row.closed_at?.toISOString() ?? null,
    };
  }
}
