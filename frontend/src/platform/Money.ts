// Money Platform Capability - Precise Currency Handling

interface CurrencyConfig {
  symbol: string;
  decimals: number;
  position: 'before' | 'after';
}

type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'TRY';

class Money {
  static CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
    EUR: { symbol: '€', decimals: 2, position: 'before' },
    USD: { symbol: '$', decimals: 2, position: 'before' },
    GBP: { symbol: '£', decimals: 2, position: 'before' },
    TRY: { symbol: '₺', decimals: 2, position: 'after' }
  };

  /**
   * Format amount in minor units (cents)
   */
  static format(amountMinor: number, currencyCode: string = 'EUR', locale: string | null = null): string {
    const currency = this.CURRENCIES[currencyCode as CurrencyCode] || this.CURRENCIES.EUR;
    const amountMajor = amountMinor / Math.pow(10, currency.decimals);
    const formatted = amountMajor.toFixed(currency.decimals);

    if (currency.position === 'before') {
      return `${currency.symbol}${formatted}`;
    } else {
      return `${formatted}${currency.symbol}`;
    }
  }

  /**
   * Parse string to minor units
   */
  static parse(input: string, currencyCode: string = 'EUR'): number {
    const currency = this.CURRENCIES[currencyCode as CurrencyCode] || this.CURRENCIES.EUR;

    // Clean input
    let cleaned = input.replace(/[^0-9.,]/g, '');

    // Handle comma decimal
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/,/g, '');
    }

    const amountMajor = parseFloat(cleaned) || 0;
    return Math.round(amountMajor * Math.pow(10, currency.decimals));
  }

  static getCurrencyMeta(code: string): CurrencyConfig {
    return this.CURRENCIES[code as CurrencyCode] || this.CURRENCIES.EUR;
  }
}

export default Money;
