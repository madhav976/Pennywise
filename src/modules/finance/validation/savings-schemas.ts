import { z } from 'zod';

export const SavingsGoalStatusEnum = z.enum(['active', 'paused', 'completed']);

const strictPositiveDecimal = z
  .string()
  .trim()
  .refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Amount must be strictly greater than 0' }
  );

const nonNegativeDecimal = z
  .string()
  .trim()
  .refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: 'Initial saved amount cannot be negative' }
  );

const isoDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format');

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1, 'Goal name is required').max(120),
  category: z.string().trim().min(1, 'Goal category is required').max(80).default('Other'),
  targetAmount: strictPositiveDecimal,
  initialAmount: nonNegativeDecimal.default('0.0000'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be an ISO 4217 3-letter code')
    .toUpperCase()
    .default('USD'),
  targetDate: isoDateString,
  description: z.string().trim().max(300).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
});

export const updateSavingsGoalSchema = z.object({
  goalId: z.string().uuid('Invalid goal UUID'),
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  targetAmount: strictPositiveDecimal.optional(),
  targetDate: isoDateString.optional(),
  description: z.string().trim().max(300).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  status: SavingsGoalStatusEnum.optional(),
});

export const contributeToGoalSchema = z.object({
  goalId: z.string().uuid('Invalid goal UUID'),
  sourceAccountId: z.string().uuid('Invalid source account UUID'),
  amount: strictPositiveDecimal,
  contributionDate: z.string().datetime({ message: 'Invalid ISO 8601 contribution date' }),
  notes: z.string().trim().max(300).optional().nullable(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
export type ContributeToGoalInput = z.infer<typeof contributeToGoalSchema>;

