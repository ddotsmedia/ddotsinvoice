import { z } from 'zod';
import { Currency, UserRole } from './types';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  nameAr: z.string().max(255).optional(),
  trn: z.string().max(15).optional().or(z.literal('')),
  email: z.string().email('Valid email is required').min(1, 'Email is required'),
  phone: z.string().min(1, 'Phone number is required').max(20),
  address: z.string().optional(),
  addressAr: z.string().optional(),
  currency: z.nativeEnum(Currency),
  fiscalYearStart: z.string().max(5).optional(),
  logoUrl: z.string().max(500).optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
});

export const tenantSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,100}$/),
  name: z.string().min(1).max(255),
  plan: z.string().max(50).default('starter'),
});
