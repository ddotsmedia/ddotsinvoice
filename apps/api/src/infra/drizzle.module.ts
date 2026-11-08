import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, Db } from '@ddotsinvoice/db';

// App pool: use withTenant() for every tenant-scoped query (RLS)
export const DB = Symbol('DB');
// Admin/pre-auth pool: no tenant context (login, platform admin)
export const ADMIN_DB = Symbol('ADMIN_DB');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (c: ConfigService): Db => createDb(c.getOrThrow<string>('DATABASE_URL'), 10),
    },
    {
      provide: ADMIN_DB,
      inject: [ConfigService],
      useFactory: (c: ConfigService): Db => createDb(c.getOrThrow<string>('DATABASE_URL'), 5),
    },
  ],
  exports: [DB, ADMIN_DB],
})
export class DrizzleModule {}
