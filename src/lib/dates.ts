/**
 * Timezone-aware date boundaries and period range calculator.
 */

export type DatePeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
}

/**
 * Calculates start and end timestamps for a given period in UTC / specified timezone.
 */
export function calculateDateRange(
  period: DatePeriod,
  customStart?: string | Date,
  customEnd?: string | Date,
  _timezone: string = 'UTC'
): DateRange {
  const now = new Date();

  let start: Date;
  let end: Date;

  switch (period) {
    case 'today': {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      break;
    }

    case 'this_week': {
      // Monday as week start
      const day = now.getUTCDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday, 0, 0, 0, 0));
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
      break;
    }

    case 'this_month': {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      // Day 0 of next month is the last day of this month
      const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), lastDay, 23, 59, 59, 999));
      break;
    }

    case 'last_month': {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).getUTCDate();
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, lastDay, 23, 59, 59, 999));
      break;
    }

    case 'this_year': {
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      break;
    }

    case 'custom': {
      if (!customStart) {
        throw new Error('Custom date range requires a valid start date');
      }
      start = new Date(customStart);
      end = customEnd ? new Date(customEnd) : new Date();
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid custom date boundary passed');
      }
      if (start > end) {
        throw new Error('Custom start date cannot be after end date');
      }
      break;
    }

    default:
      throw new Error(`Unsupported date period: ${period}`);
  }

  return {
    startDate: start,
    endDate: end,
    startDateIso: start.toISOString(),
    endDateIso: end.toISOString(),
  };
}

/**
 * Helper to safely advance months without rolling over into the following month
 * (e.g., Jan 31 + 1 month = Feb 28, not March 2/3).
 */
function addMonthsClamped(date: Date, monthsToAdd: number): Date {
  const target = new Date(date);
  const targetMonth = target.getUTCMonth() + monthsToAdd;
  const originalDay = target.getUTCDate();

  // Set month to target
  target.setUTCMonth(targetMonth);

  // If the day rolled over, clamp back to the last day of the expected month
  const expectedMonth = ((targetMonth % 12) + 12) % 12;
  if (target.getUTCMonth() !== expectedMonth) {
    // Set to day 0 of the overflowed month to get last day of expected month
    target.setUTCDate(0);
  } else {
    // Check if the original day was higher than max days of target month
    const maxDays = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    if (originalDay > maxDays) {
      target.setUTCDate(maxDays);
    }
  }

  return target;
}

/**
 * Calculates the next execution date for a recurring schedule.
 */
export function calculateNextExecutionDate(
  currentDate: Date,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom',
  intervalCount: number = 1
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + (1 * intervalCount));
      return next;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + (7 * intervalCount));
      return next;
    case 'biweekly':
      next.setUTCDate(next.getUTCDate() + (14 * intervalCount));
      return next;
    case 'monthly':
      return addMonthsClamped(next, 1 * intervalCount);
    case 'quarterly':
      return addMonthsClamped(next, 3 * intervalCount);
    case 'yearly':
      return addMonthsClamped(next, 12 * intervalCount);
    case 'custom':
      next.setUTCDate(next.getUTCDate() + Math.max(1, intervalCount));
      return next;
    default:
      throw new Error(`Unsupported recurring frequency: ${frequency}`);
  }
}
