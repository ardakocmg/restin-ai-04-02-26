// Locale Platform Capability
class Locale {
  static getCurrentLocale(): string {
    return navigator.language || 'en-US';
  }

  static formatDate(timestamp: string | number | Date, options: Intl.DateTimeFormatOptions = {}): string {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(this.getCurrentLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(date);
  }

  static formatTime(timestamp: string | number | Date, options: Intl.DateTimeFormatOptions = {}): string {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(this.getCurrentLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date);
  }

  static formatDateTime(timestamp: string | number | Date): string {
    return `${this.formatDate(timestamp)} ${this.formatTime(timestamp)}`;
  }

  static formatNumber(number: number, decimals: number = 0): string {
    return new Intl.NumberFormat(this.getCurrentLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }

  static parseNumber(str: string): number {
    // Remove thousands separators, handle decimal
    const cleaned = str.replace(/[^0-9.,]/g, '');

    // Detect decimal separator
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      return parseFloat(cleaned.replace(',', '.'));
    } else {
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  }
}

export default Locale;
