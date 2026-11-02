import { z } from 'zod';
import { PaymentMethodEnum, TransactionTypeEnum } from './transaction-schemas';

export const RecurringFrequencyEnum = z.enum([
  'daily',
  'weekly',
  'biweekly',
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
    {
      message: 'Amount must be a positive number strictly greater than 0',
    }
  );

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createRecurringSchema = z
  .object({
    accountId: z.string().uuid('Invalid account UUID'),
    categoryId: z.string().uuid('Invalid category UUID').optional().nullable(),
    transactionType: TransactionTypeEnum,
    targetAccountId: z.string().uuid('Invalid target account UUID').optional().nullable(),
    amount: strictPositiveDecimal,
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be an ISO 4217 3-letter code')
      .toUpperCase()
      .default('USD'),
    description: z.string().trim().min(1, 'Description is required').max(255),
    merchantName: z.string().trim().max(100).optional().nullable(),
    paymentMethod: PaymentMethodEnum.default('other'),
    frequency: RecurringFrequencyEnum,
    intervalCount: z.coerce.number().int().min(1).default(1),
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format'),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.transactionType === 'transfer') {
        return !!data.targetAccountId && data.targetAccountId !== data.accountId;
      }
      return !!data.categoryId;
    },
    {
      message: 'Transfers require a distinct targetAccountId; Income/Expense requires a categoryId',
      path: ['targetAccountId'],
    }
  )
  .refine(
    (data) => {
      if (data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

export const updateRecurringSchema = z.object({
  recurringId: z.string().uuid('Invalid recurring transaction UUID'),
  amount: strictPositiveDecimal.optional(),
  description: z.string().trim().min(1).max(255).optional(),
  merchantName: z.string().trim().max(100).optional().nullable(),
  paymentMethod: PaymentMethodEnum.optional(),
  endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

