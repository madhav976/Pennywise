import { describe, expect, it } from 'vitest';
import { calculateNextExecutionDate } from '@/lib/dates';

describe('Recurring Transaction Schedule Date Calculations', () => {
  it('advances daily schedule by interval count', () => {
    const base = new Date('2026-11-01T00:00:00Z');
    const next1 = calculateNextExecutionDate(base, 'daily', 1);
    expect(next1.toISOString().slice(0, 10)).toBe('2026-11-02');

    const next3 = calculateNextExecutionDate(base, 'daily', 3);
    expect(next3.toISOString().slice(0, 10)).toBe('2026-11-04');
  });

  it('advances weekly schedule correctly', () => {
    const base = new Date('2026-11-02T00:00:00Z'); // Monday
    const next = calculateNextExecutionDate(base, 'weekly', 1);
    expect(next.toISOString().slice(0, 10)).toBe('2026-11-09'); // Next Monday
  });

  it('advances biweekly schedule by 14 days', () => {
    const base = new Date('2026-11-02T00:00:00Z');
    const next = calculateNextExecutionDate(base, 'biweekly', 1);
    expect(next.toISOString().slice(0, 10)).toBe('2026-11-16');
  });

  it('advances monthly schedule correctly across month boundaries', () => {
    const base = new Date('2026-11-15T00:00:00Z');
    const next = calculateNextExecutionDate(base, 'monthly', 1);
    expect(next.toISOString().slice(0, 10)).toBe('2026-12-15');

    const nextQuarter = calculateNextExecutionDate(base, 'monthly', 3);
    expect(nextQuarter.toISOString().slice(0, 10)).toBe('2027-02-15');
  });

  it('advances quarterly schedule by 3 months', () => {
    const base = new Date('2026-03-31T00:00:00Z');
    const next = calculateNextExecutionDate(base, 'quarterly', 1);
    // March + 3 months -> June
    expect(next.getUTCMonth()).toBe(5); // June (0-indexed: 5)
  });

  it('advances yearly schedule by 1 year', () => {
    const base = new Date('2026-11-02T00:00:00Z');
    const next = calculateNextExecutionDate(base, 'yearly', 1);
    expect(next.toISOString().slice(0, 10)).toBe('2027-11-02');
  });

  it('supports custom interval count', () => {
    const base = new Date('2026-11-02T00:00:00Z');
    const next = calculateNextExecutionDate(base, 'custom', 10);
    expect(next.toISOString().slice(0, 10)).toBe('2026-11-12');
  });
});

