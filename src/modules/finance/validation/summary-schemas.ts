import { z } from 'zod';

export const summaryQuerySchema = z
  .object({
    period: z
      .enum(['today', 'this_week', 'this_month', 'last_month', 'this_year', 'custom'])
      .default('this_month'),
    customStart: z.string().datetime().optional(),
    customEnd: z.string().datetime().optional(),
    timezone: z.string().default('UTC'),
    accountId: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return !!data.customStart;
      }
      return true;
    },
    {
      message: 'Custom period requires customStart timestamp',
      path: ['customStart'],
    }
  );

export type SummaryQueryInput = z.infer<typeof summaryQuerySchema>;

