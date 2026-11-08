import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (c: ConfigService): Redis =>
        new Redis(c.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: 1 }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
