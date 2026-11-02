import { z } from 'zod';

export const AccountTypeEnum = z.enum([
  'cash',
  'checking',
  'savings',
  'credit_card',
  'digital_wallet',
  'investment',
  'loan',
]);

// Decimal string validator that must be a valid number
const decimalString = z
  .string()
  .trim()
  .refine((val) => !isNaN(Number(val)), {
    message: 'Must be a valid decimal number string',
  });

const positiveDecimalString = decimalString.refine((val) => Number(val) >= 0, {
  message: 'Amount must be greater than or equal to 0',
});

export const createAccountSchema = z
  .object({
    accountName: z.string().trim().min(1, 'Account name is required').max(100),
    accountType: AccountTypeEnum,
    institutionName: z.string().trim().max(100).optional().nullable(),
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be an ISO 4217 3-letter code')
      .toUpperCase()
      .default('USD'),
    openingBalance: decimalString.default('0.0000'),
    creditLimit: positiveDecimalString.optional().nullable(),
    description: z.string().trim().max(300).optional().nullable(),
    color: z.string().trim().max(20).optional().nullable(),
    icon: z.string().trim().max(40).optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.accountType === 'credit_card' &&
        data.creditLimit !== undefined &&
        data.creditLimit !== null
      ) {
        return Number(data.creditLimit) >= 0;
      }
      return true;
    },
    {
      message: 'Credit limit must be a positive number for credit cards',
      path: ['creditLimit'],
    }
  );

export const updateAccountSchema = z.object({
  accountId: z.string().uuid('Invalid account UUID'),
  accountName: z.string().trim().min(1).max(100).optional(),
  accountType: AccountTypeEnum.optional(),
  institutionName: z.string().trim().max(100).optional().nullable(),
  creditLimit: positiveDecimalString.optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
