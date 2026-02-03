// Defensive helpers - Never crash on bad data
export const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const safeString = (v, fallback = "") =>
  typeof v === "string" ? v : fallback;

export const safeArray = (v) => (Array.isArray(v) ? v : []);

export const safeObject = (v) =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};

export const money = (v, currencySymbol = "€") =>
  `${currencySymbol}${safeNumber(v).toFixed(2)}`;

export default { safeNumber, safeString, safeArray, safeObject, money };
