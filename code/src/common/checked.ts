import { BadRequestException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export async function checked<T extends object>(type: ClassConstructor<T>, input: unknown): Promise<T> {
  if (!input || typeof input !== 'object') throw new BadRequestException('Expected an object');
  const value = plainToInstance(type, input);
  if ((await validate(value, { whitelist: true, forbidUnknownValues: true })).length)
    throw new BadRequestException(`Invalid ${type.name}`);
  return value;
}
