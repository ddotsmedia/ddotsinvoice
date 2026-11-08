import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from './index';

async function main(): Promise<void> {
  const db = createDb((process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL)!, 1);
  await migrate(db, { migrationsFolder: path.join(__dirname, '../migrations') });
  console.log('migrations applied');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
