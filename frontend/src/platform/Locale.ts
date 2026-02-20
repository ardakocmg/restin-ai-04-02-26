// @ts-nocheck
// Locale Platform Capability
class Locale {
  static getCurrentLocale() {
    return navigator.language || 'en-US';
  }

  static formatDate(timestamp, options = {}) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(this.getCurrentLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(date);
  }

  static formatTime(timestamp, options = {}) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(this.getCurrentLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date);
  }

  static formatDateTime(timestamp) {
    return `${this.formatDate(timestamp)} ${this.formatTime(timestamp)}`;
  }

  static formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat(this.getCurrentLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }

  static parseNumber(str) {
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
