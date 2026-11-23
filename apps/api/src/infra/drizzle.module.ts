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
            // In production without DATABASE_ADMIN_URL, login WILL fail because
            // ddots_app (DATABASE_URL) is a NOSUPERUSER role subject to RLS on the users table.
            // Run migration 0016_admin_role and set DATABASE_ADMIN_URL to ddots_admin connection.
            throw new Error(
              'DATABASE_ADMIN_URL is required in production. ' +
              'The ddots_admin role (BYPASSRLS) must be used for auth and super-admin queries. ' +
              'Run scripts/setup-db-roles.sh and add DATABASE_ADMIN_URL to your .env file.',
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
