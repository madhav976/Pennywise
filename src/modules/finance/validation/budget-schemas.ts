import { z } from 'zod';

export const BudgetPeriodEnum = z.enum([
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

const strictPositiveDecimal = z
  .string()
  .trim()
  .refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Budget amount must be strictly greater than 0' }
  );

const isoDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createBudgetSchema = z
  .object({
    name: z.string().trim().min(1, 'Budget name is required').max(120),
    categoryId: z.string().uuid('Invalid category UUID').optional().nullable(),
    amount: strictPositiveDecimal,
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be an ISO 4217 3-letter code')
      .toUpperCase()
      .default('USD'),
    period: BudgetPeriodEnum.default('monthly'),
    startDate: isoDateString,
    endDate: isoDateString,
    description: z.string().trim().max(300).optional().nullable(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const updateBudgetSchema = z.object({
  budgetId: z.string().uuid('Invalid budget UUID'),
  name: z.string().trim().min(1).max(120).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: strictPositiveDecimal.optional(),
  period: BudgetPeriodEnum.optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  description: z.string().trim().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

