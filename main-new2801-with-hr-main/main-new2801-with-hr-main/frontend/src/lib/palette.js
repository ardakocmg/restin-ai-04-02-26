/**
 * MEGA PATCH: Color Palette Helper
 * Provides dynamic status colors from venue settings
 */

export const getStatusColor = (settings, status) => {
  const palette = settings?.ui?.palette || {};
  return palette[status] || undefined;
};

export const getStatusColorClass = (settings, status) => {
  const color = getStatusColor(settings, status);
  if (!color) return "";
  
  // Convert hex to Tailwind-compatible style
  return `bg-[${color}]`;
};

export const DEFAULT_PALETTE = {
  NEW: "#2F80ED",
  PREPARING: "#F2994A",
  READY: "#27AE60",
  DONE: "#828282",
  HELD: "#EB5757",
  PASS: "#9B51E0"
};
