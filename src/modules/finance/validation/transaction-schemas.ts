import { z } from 'zod';

export const TransactionTypeEnum = z.enum(['income', 'expense', 'transfer']);

export const PaymentMethodEnum = z.enum([
  'cash',
  'upi',
  'debit_card',
  'credit_card',
  'bank_transfer',
  'digital_wallet',
  'other',
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

export const createTransactionSchema = z
  .object({
    accountId: z.string().uuid('Invalid account UUID'),
    categoryId: z.string().uuid('Invalid category UUID'),
    transactionType: z.enum(['income', 'expense']),
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
    transactionDate: z.string().datetime({ message: 'Invalid ISO 8601 transaction date' }),
    notes: z.string().trim().max(1000).optional().nullable(),
    referenceNumber: z.string().trim().max(100).optional().nullable(),
  });

export const createTransferSchema = z
  .object({
    sourceAccountId: z.string().uuid('Invalid source account UUID'),
    destinationAccountId: z.string().uuid('Invalid destination account UUID'),
    amount: strictPositiveDecimal,
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be an ISO 4217 3-letter code')
      .toUpperCase()
      .default('USD'),
    description: z.string().trim().min(1, 'Description is required').max(255),
    paymentMethod: PaymentMethodEnum.default('bank_transfer'),
    transactionDate: z.string().datetime({ message: 'Invalid ISO 8601 transaction date' }),
    notes: z.string().trim().max(1000).optional().nullable(),
    referenceNumber: z.string().trim().max(100).optional().nullable(),
  })
  .refine((data) => data.sourceAccountId !== data.destinationAccountId, {
    message: 'Source and destination accounts must be distinct',
    path: ['destinationAccountId'],
  });

export const updateTransactionSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction UUID'),
  accountId: z.string().uuid('Invalid account UUID').optional(),
  categoryId: z.string().uuid('Invalid category UUID').optional().nullable(),
  amount: strictPositiveDecimal.optional(),
  description: z.string().trim().min(1).max(255).optional(),
  merchantName: z.string().trim().max(100).optional().nullable(),
  paymentMethod: PaymentMethodEnum.optional(),
  transactionDate: z.string().datetime({ message: 'Invalid ISO 8601 transaction date' }).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
});

export const deleteTransactionSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction UUID'),
});

export const transactionFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  transactionType: TransactionTypeEnum.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  merchantName: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['transaction_date', 'amount', 'created_at']).default('transaction_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

