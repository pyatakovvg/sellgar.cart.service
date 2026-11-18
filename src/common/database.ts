import { EntityManager } from 'typeorm';

// TypeORM raw UPDATE may return rows or [rows, affected].
export function rows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return Array.isArray(result) ? (result as T[]) : [];
}

export async function lockOwner(manager: EntityManager, ownerUuid: string, exclusive = false): Promise<void> {
  const operation = exclusive ? 'pg_advisory_xact_lock' : 'pg_advisory_xact_lock_shared';
  await manager.query(`SELECT ${operation}(hashtextextended($1, 0))`, [`cart-owner:${ownerUuid}`]);
}
