import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

export const createDb = (url: string, max = 10) => drizzle(postgres(url, { max }), { schema });

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// RLS: tenant context scoped to the transaction (is_local = true)
export const withTenant = <T>(db: Db, tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
