import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { requestHash } from '../../../../common/request-hash';

@Injectable()
export class CartCommandRepository {
  constructor(@InjectDataSource() private readonly source: DataSource) {}

  async execute<T extends object>(
    type: string,
    input: { idempotencyKey: string },
    operation: (manager: EntityManager) => Promise<T>,
    authorize?: (manager: EntityManager) => Promise<void>,
  ): Promise<T> {
    const hash = requestHash({ type, input });
    return this.source.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        `cart-command:${input.idempotencyKey}`,
      ]);
      if (authorize) await authorize(manager);
      const [existing] = await manager.query(
        'SELECT command_type, request_hash, result FROM command_request WHERE command_id=$1',
        [input.idempotencyKey],
      );
      if (existing) {
        if (existing.command_type !== type || existing.request_hash !== hash)
          throw new ConflictException('Idempotency key was used for another request or owner');
        return existing.result as T;
      }

      const result = await operation(manager);
      await manager.query(
        'INSERT INTO command_request(command_id,command_type,request_hash,result) VALUES ($1,$2,$3,$4)',
        [input.idempotencyKey, type, hash, JSON.stringify(result)],
      );
      return result;
    });
  }
}
