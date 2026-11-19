import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CartCheckoutService } from '../service/cart-checkout.service';
import { CartService } from '../service/cart.service';
import {
  AddCartItemDto,
  CartCheckoutDto,
  CartScopeDto,
  CloseOwnerDto,
  PrepareCartDto,
  RemoveCartItemDto,
  SetCartItemDto,
} from './dto/cart.dto';

@Controller()
export class CartController {
  constructor(
    private readonly carts: CartService,
    private readonly checkouts: CartCheckoutService,
  ) {}

  @MessagePattern({ cmd: 'cart.get' })
  get(@Payload() dto: CartScopeDto) {
    return this.carts.get(dto);
  }

  @MessagePattern({ cmd: 'cart.item.add' })
  add(@Payload() dto: AddCartItemDto) {
    return this.carts.add(dto);
  }

  @MessagePattern({ cmd: 'cart.item.setQuantity' })
  set(@Payload() dto: SetCartItemDto) {
    return this.carts.setQuantity(dto);
  }

  @MessagePattern({ cmd: 'cart.item.remove' })
  remove(@Payload() dto: RemoveCartItemDto) {
    return this.carts.remove(dto);
  }

  @MessagePattern({ cmd: 'cart.owner.close' })
  close(@Payload() dto: CloseOwnerDto) {
    return this.carts.closeOwner(dto);
  }

  @MessagePattern({ cmd: 'cart.checkout.prepare' })
  prepare(@Payload() dto: PrepareCartDto) {
    return this.checkouts.prepare(dto);
  }

  @MessagePattern({ cmd: 'cart.checkout.cancel' })
  cancel(@Payload() dto: CartCheckoutDto) {
    return this.checkouts.cancel(dto);
  }

  @MessagePattern({ cmd: 'cart.health' })
  health() {
    return { service: 'cart_srv', status: 'ok' };
  }
}
