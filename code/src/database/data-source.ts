import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';

import { CartDatabaseOptions } from './cart-database.options';

if (existsSync('.env')) process.loadEnvFile('.env');
export default new DataSource(CartDatabaseOptions.create(process.env));
