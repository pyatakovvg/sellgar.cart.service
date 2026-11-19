import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CartAdminService } from '../service/cart-admin.service';
import { GetAllCartsDto, GetCartByUuidDto } from './dto/get-all-carts.dto';
import {
  AdminAddCartItemDto,
  AdminRemoveCartItemDto,
  AdminSetCartItemDto,
} from './dto/cart-admin-command.dto';

@Controller()
export class CartAdminController {
  constructor(private readonly carts: CartAdminService) {}

  @MessagePattern({ cmd: 'cart.admin.getAll' })
  getAll(@Payload() query: GetAllCartsDto) {
    return this.carts.getAll(query);
  }

  @MessagePattern({ cmd: 'cart.admin.getByUuid' })
  getByUuid(@Payload() dto: GetCartByUuidDto) {
    return this.carts.getByUuid(dto.uuid);
  }

  @MessagePattern({ cmd: 'cart.admin.item.add' })
  add(@Payload() dto: AdminAddCartItemDto) {
    return this.carts.add(dto);
  }

  @MessagePattern({ cmd: 'cart.admin.item.setQuantity' })
  setQuantity(@Payload() dto: AdminSetCartItemDto) {
    return this.carts.setQuantity(dto);
  }

  @MessagePattern({ cmd: 'cart.admin.item.remove' })
  remove(@Payload() dto: AdminRemoveCartItemDto) {
    return this.carts.remove(dto);
  }
}
