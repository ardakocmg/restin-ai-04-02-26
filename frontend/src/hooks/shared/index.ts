/**
 * Shared Hooks — Barrel Export
 * 
 * All cross-module hooks live here.
 * Import from '@/hooks/shared' for unified data access.
 */

// POS ↔ HR
export { useStaffService } from './useStaffService';
export type { StaffMember, PosConfig, StaffStats, StaffActivity } from './useStaffService';

export { useShiftService } from './useShiftService';
export type { ShiftEntry, WeeklyGrid } from './useShiftService';

// POS ↔ Inventory
export { useItemService } from './useItemService';
export type { InventoryItem } from './useItemService';

export { useRecipeService } from './useRecipeService';
export type { Recipe, RecipeIngredient } from './useRecipeService';

// POS ↔ CRM
export { useGuestService } from './useGuestService';
export type { GuestProfile } from './useGuestService';

export { useLoyaltyService } from './useLoyaltyService';
export type { LoyaltyConfig, LoyaltyTier } from './useLoyaltyService';

// POS ↔ Finance
export { useAccountingService } from './useAccountingService';
export type { AccountingGroup, TaxProfile, PaymentMethod } from './useAccountingService';

// Generic Venue Config (POS config pages)
export { useVenueConfig } from './useVenueConfig';
