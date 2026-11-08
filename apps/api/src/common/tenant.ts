import { ForbiddenException } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const requireTenant = (tenantId: string | null): string => {
  if (!tenantId) throw new ForbiddenException('Tenant context required');
  return tenantId;
};

export const requireCompany = (companyId: string | null): string => {
  if (!companyId) throw new ForbiddenException('Company context required');
  return companyId;
};

export class PageQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
