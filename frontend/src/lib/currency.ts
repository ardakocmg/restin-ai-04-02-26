// Currency utility functions for multi-currency support

const CURRENCY_CONFIG = {
  EUR: { symbol: '€', position: 'before', decimal: ',', thousand: '.' },
  USD: { symbol: '$', position: 'before', decimal: '.', thousand: ',' },
  GBP: { symbol: '£', position: 'before', decimal: '.', thousand: ',' },
  TRY: { symbol: '₺', position: 'after', decimal: ',', thousand: '.' },
};

/**
 * Format amount with venue's currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (EUR, USD, GBP, TRY)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'EUR') => {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.EUR;
  const formatted = amount.toFixed(2);
  
  if (config.position === 'before') {
    return `${config.symbol}${formatted}`;
  } else {
    return `${formatted}${config.symbol}`;
  }
};

/**
 * Get currency symbol for venue
 * @param {object} venue - Venue object with currency field
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (venue) => {
  if (!venue) return '€';
  const currency = venue.currency || 'EUR';
  return CURRENCY_CONFIG[currency]?.symbol || '€';
};

/**
 * Format amount with venue context
 * @param {number} amount - Amount to format  
 * @param {object} venue - Venue object
 * @returns {string} Formatted currency string
 */
export const formatVenueCurrency = (amount, venue) => {
  const currency = venue?.currency || 'EUR';
  return formatCurrency(amount, currency);
};

export default { formatCurrency, getCurrencySymbol, formatVenueCurrency };
