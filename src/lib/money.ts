import { Decimal } from 'decimal.js';

// Configure Decimal.js precision for financial accuracy
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal | Money;

/**
 * High-precision financial decimal wrapper class.
 * Ensures zero-loss arithmetic across all financial operations.
 */
export class Money {
  private readonly value: Decimal;

  constructor(amount: MoneyInput) {
    if (typeof amount === 'number') {
      // Convert number to string first to avoid floating point imprecision
      this.value = new Decimal(amount.toString());
    } else if (typeof amount === 'string') {
      const clean = amount.trim();
      if (!clean || isNaN(Number(clean))) {
        throw new Error(`Invalid monetary amount string: "${amount}"`);
      }
      this.value = new Decimal(clean);
    } else if (amount instanceof Decimal) {
      this.value = amount;
    } else {
      throw new Error(`Unsupported money input type: ${typeof amount}`);
    }
  }

  static from(amount: MoneyInput): Money {
    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: MoneyInput): Money {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return new Money(this.value.plus(o));
  }

  subtract(other: MoneyInput): Money {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return new Money(this.value.minus(o));
  }

  multiply(factor: MoneyInput): Money {
    const f = factor instanceof Money ? factor.value : new Money(factor).value;
    return new Money(this.value.times(f));
  }

  divide(divisor: MoneyInput): Money {
    const d = divisor instanceof Money ? divisor.value : new Money(divisor).value;
    if (d.isZero()) {
      throw new Error('Division by zero in financial calculation');
    }
    return new Money(this.value.dividedBy(d));
  }

  negate(): Money {
    return new Money(this.value.negated());
  }

  abs(): Money {
    return new Money(this.value.abs());
  }

  equals(other: MoneyInput): boolean {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return this.value.equals(o);
  }

  greaterThan(other: MoneyInput): boolean {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return this.value.greaterThan(o);
  }

  greaterThanOrEqualTo(other: MoneyInput): boolean {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return this.value.greaterThanOrEqualTo(o);
  }

  lessThan(other: MoneyInput): boolean {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return this.value.lessThan(o);
  }

  lessThanOrEqualTo(other: MoneyInput): boolean {
    const o = other instanceof Money ? other.value : new Money(other).value;
    return this.value.lessThanOrEqualTo(o);
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  /**
   * Formats string for database storage with exact 4 decimal digits (NUMERIC(15, 4))
   */
  toDbString(): string {
    return this.value.toFixed(4);
  }

  /**
   * Standard 2-decimal presentation format (e.g., "1250.50")
   */
  toDisplayString(decimalPlaces: number = 2): string {
    return this.value.toFixed(decimalPlaces);
  }

  /**
   * Number representation (only for display/charting, never for storage/calculations)
   */
  toNumber(): number {
    return this.value.toNumber();
  }
}
