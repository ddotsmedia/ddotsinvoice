import { Body, Controller, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { suggestions } from '@ddotsinvoice/db';
import type { Db } from '@ddotsinvoice/db';
import { ADMIN_DB } from '../../infra/drizzle.module';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';

@Controller('suggestions')
export class SuggestionsController {
  constructor(@Inject(ADMIN_DB) private readonly db: Db) {}

  @Post()
  @Throttle({ global: { ttl: 60000, limit: 3 } })
  async create(@Body() dto: CreateSuggestionDto) {
    const [row] = await this.db
      .insert(suggestions)
      .values({
        name: dto.name,
        email: dto.email,
        category: dto.category,
        priority: dto.priority ?? 'medium',
        subject: dto.subject,
        description: dto.description,
        wantsNotification: dto.wantsNotification ?? false,
      })
      .returning({ id: suggestions.id });
    return { success: true, id: row.id };
  }
}
