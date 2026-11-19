import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';

import { CART_MODELS } from '../api/v1/cart/model';

export class CartDatabaseOptions {
  static create(env: NodeJS.ProcessEnv): DataSourceOptions {
    const schema = env.CART_DATABASE_SCHEMA ?? 'public';
    if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid CART_DATABASE_SCHEMA');

    return {
      type: 'postgres',
      installExtensions: false,
      host: this.required(env, 'DATABASE_HOST'),
      port: Number(env.DATABASE_PORT ?? 5432),
      username: this.required(env, 'DATABASE_USERNAME'),
      password: this.required(env, 'DATABASE_PASSWORD'),
      database: this.required(env, 'DATABASE_DATABASE_NAME'),
      schema,
      extra: { options: `-c search_path=${schema},public` },
      entities: CART_MODELS,
      migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
      synchronize: false,
      migrationsRun: false,
      dropSchema: false,
    };
  }

  private static required(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (!value) throw new Error(`Missing configuration: ${key}`);
    return value;
  }
}
