import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GetAllCartsDto } from '../controller/dto/get-all-carts.dto';
import { CartAdminQueryRepository } from '../repository/cart-admin-query.repository';
import {
  AdminAddCartItemDto,
  AdminRemoveCartItemDto,
  AdminSetCartItemDto,
} from '../controller/dto/cart-admin-command.dto';
import { CartService } from './cart.service';

@Injectable()
export class CartAdminService {
  constructor(
    @InjectDataSource() private readonly source: DataSource,
    private readonly queries: CartAdminQueryRepository,
    private readonly carts: CartService,
  ) {}

  getAll(query: GetAllCartsDto) {
    return this.source.transaction('REPEATABLE READ', (manager) => this.queries.getAll(manager, query));
  }

  getByUuid(uuid: string) {
    return this.source.transaction('REPEATABLE READ', (manager) => this.queries.getByUuid(manager, uuid));
  }

  async add(input: AdminAddCartItemDto) {
    const { cartUuid, ...command } = input;
    const scope = await this.queries.scope(this.source.manager, cartUuid);
    return this.carts.add({ ...command, ...scope }, cartUuid);
  }

  async setQuantity(input: AdminSetCartItemDto) {
    const { cartUuid, ...command } = input;
    const scope = await this.queries.scope(this.source.manager, cartUuid);
    return this.carts.setQuantity({ ...command, ...scope }, cartUuid);
  }

  async remove(input: AdminRemoveCartItemDto) {
    const { cartUuid, ...command } = input;
    const scope = await this.queries.scope(this.source.manager, cartUuid);
    return this.carts.remove({ ...command, ...scope }, cartUuid);
  }
}
