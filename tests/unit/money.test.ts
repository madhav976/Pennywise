import { describe, expect, it } from 'vitest';
import { Money } from '@/lib/money';

describe('Money (Exact Decimal Arithmetic)', () => {
  it('solves the classical IEEE 754 floating-point inaccuracy (0.1 + 0.2 = 0.3)', () => {
    // In IEEE 754: 0.1 + 0.2 === 0.30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3);

    const m1 = Money.from('0.1');
    const m2 = Money.from('0.2');
    const sum = m1.add(m2);

    expect(sum.toDisplayString(1)).toBe('0.3');
    expect(sum.equals('0.3')).toBe(true);
    expect(sum.toDbString()).toBe('0.3000');
  });

  it('performs exact addition and subtraction across multi-digit currency amounts', () => {
    const balance = Money.from('12450.7550');
    const expense = Money.from('450.2525');

    const remaining = balance.subtract(expense);
    expect(remaining.toDbString()).toBe('12000.5025');

    const restored = remaining.add(expense);
    expect(restored.toDbString()).toBe('12450.7550');
  });

  it('multiplies and divides with exact precision', () => {
    const rate = Money.from('19.99');
    const count = 3;
    const total = rate.multiply(count);
    expect(total.toDisplayString(2)).toBe('59.97');

    const split = total.divide(3);
    expect(split.toDisplayString(2)).toBe('19.99');
  });

  it('throws an error on division by zero', () => {
    const m = Money.from('100.00');
    expect(() => m.divide('0')).toThrowError('Division by zero');
  });

  it('correctly compares amounts', () => {
    const a = Money.from('150.0000');
    const b = Money.from('150.0000');
    const c = Money.from('150.0001');

    expect(a.equals(b)).toBe(true);
    expect(c.greaterThan(a)).toBe(true);
    expect(a.lessThan(c)).toBe(true);
    expect(a.greaterThanOrEqualTo(b)).toBe(true);
  });

  it('correctly handles negative values and absolute values', () => {
    const m = Money.from('-45.50');
    expect(m.isNegative()).toBe(true);
    expect(m.isPositive()).toBe(false);
    expect(m.abs().toDbString()).toBe('45.5000');
    expect(m.negate().toDbString()).toBe('45.5000');
  });
});

