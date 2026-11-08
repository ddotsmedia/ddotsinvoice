import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import type { Db } from '@ddotsinvoice/db';
import type Redis from 'ioredis';
import { DB } from '../../infra/drizzle.module';
import { REDIS } from '../../infra/redis.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [db, redis] = await Promise.all([
      this.db.execute(sql`SELECT 1`).then(() => 'ok', () => 'error'),
      this.redis.ping().then(() => 'ok', () => 'error'),
    ]);
    const body = { status: db === 'ok' && redis === 'ok' ? 'ok' : 'error', db, redis, timestamp: new Date().toISOString() };
    if (body.status !== 'ok') throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
