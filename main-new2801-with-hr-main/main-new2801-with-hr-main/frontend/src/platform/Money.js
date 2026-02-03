// Money Platform Capability - Precise Currency Handling
class Money {
  static CURRENCIES = {
    EUR: { symbol: '€', decimals: 2, position: 'before' },
    USD: { symbol: '$', decimals: 2, position: 'before' },
    GBP: { symbol: '£', decimals: 2, position: 'before' },
    TRY: { symbol: '₺', decimals: 2, position: 'after' }
  };

  /**
   * Format amount in minor units (cents)
   * @param {number} amountMinor - Amount in cents
   * @param {string} currencyCode - EUR, USD, GBP, TRY
   * @param {string} locale - Optional locale (default: auto)
   */
  static format(amountMinor, currencyCode = 'EUR', locale = null) {
    const currency = this.CURRENCIES[currencyCode] || this.CURRENCIES.EUR;
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
   * @param {string} input - "12.50" or "12,50"
   * @param {string} currencyCode
   */
  static parse(input, currencyCode = 'EUR') {
    const currency = this.CURRENCIES[currencyCode] || this.CURRENCIES.EUR;
    
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

  static getCurrencyMeta(code) {
    return this.CURRENCIES[code] || this.CURRENCIES.EUR;
  }
}

export default Money;
