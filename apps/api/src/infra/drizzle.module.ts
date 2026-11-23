import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, Db } from '@ddotsinvoice/db';

// App pool: use withTenant() for every tenant-scoped query (RLS)
export const DB = Symbol('DB');
// Admin/pre-auth pool: bypasses RLS (login, platform admin). Must use the ddots_admin BYPASSRLS role.
export const ADMIN_DB = Symbol('ADMIN_DB');

const adminLogger = new Logger('DrizzleModule');

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
      useFactory: (c: ConfigService): Db => {
        const adminUrl = c.get<string>('DATABASE_ADMIN_URL');
        if (!adminUrl) {
          if (c.get('NODE_ENV') === 'production') {
            // DATABASE_ADMIN_URL not set — login may still work if the users RLS policy
            // has a platform_admin_bypass policy (migration 0017). Set DATABASE_ADMIN_URL
            // (ddots_admin BYPASSRLS role) in .env for full RLS isolation.
            adminLogger.warn(
              'DATABASE_ADMIN_URL is not set in production — falling back to DATABASE_URL. ' +
              'Login works only if migration 0017 platform_admin_bypass policy is applied. ' +
              'Set DATABASE_ADMIN_URL to the ddots_admin connection string for full setup.',
            );
          }
          adminLogger.warn(
            'DATABASE_ADMIN_URL is not set — falling back to DATABASE_URL. ' +
            'Login will fail if the app role is subject to RLS (production setup). ' +
            'Set DATABASE_ADMIN_URL to the ddots_admin connection string.',
          );
        }
        return createDb(adminUrl ?? c.getOrThrow<string>('DATABASE_URL'), 5);
      },
    },
  ],
  exports: [DB, ADMIN_DB],
})
export class DrizzleModule {}
