// @ts-nocheck
/**
 * Builder Validation Engine
 * 
 * Validates POS/KDS theme layouts against the zone component registry.
 * Detects:
 *  - Duplicate singleton components (e.g. 2× PayCash)
 *  - Missing required components (e.g. no ItemGrid)
 *  - Conflicting components (e.g. QuickPay + PayCash)
 *  - Warning-level issues (no payment, no send button)
 *  - Informational tips (Express doesn't need TableSelect)
 */

import {
    type ZoneConfig,
    type ZoneComponentDef,
    type LayoutType,
    getComponentDef,
    getComponentsForLayout,
} from './themeZoneTypes';

// ─── Types ───────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
    id: string;
    severity: ValidationSeverity;
    message: string;
    suggestion?: string;
    affectedZones?: string[];   // zone IDs involved
    componentId?: string;       // which component type this is about
}

// ─── Main Validation Function ────────────────────────────────────

export function validateLayout(
    zones: ZoneConfig[],
    layoutType: LayoutType,
    themeId?: string, // e.g. 'express', 'pro', 'restin' for context-aware rules
): ValidationResult[] {
    const results: ValidationResult[] = [];
    const allDefs = getComponentsForLayout(layoutType);
    const isExpress = themeId === 'express';

    // Count instances of each component
    const componentCounts = new Map<string, { count: number; zoneIds: string[] }>();
    for (const zone of zones) {
        if (!zone.visible) continue; // hidden zones don't count
        const entry = componentCounts.get(zone.component) || { count: 0, zoneIds: [] };
        entry.count++;
        entry.zoneIds.push(zone.id);
        componentCounts.set(zone.component, entry);
    }

    // Rule 1: Duplicate singleton check
    for (const [componentId, { count, zoneIds }] of Array.from(componentCounts.entries())) {
        const def = getComponentDef(componentId);
        if (!def) continue;
        if (count > def.maxInstances) {
            results.push({
                id: `dup-${componentId}`,
                severity: 'error',
                message: `${count}× ${def.name} — maximum is ${def.maxInstances}`,
                suggestion: `Remove ${count - def.maxInstances} instance(s) of "${def.name}"`,
                affectedZones: zoneIds,
                componentId,
            });
        }
    }

    // Rule 2: Required components missing
    for (const def of allDefs) {
        if (!def.required) continue;
        const count = componentCounts.get(def.id)?.count ?? 0;
        if (count === 0) {
            // Express doesn't require TableSelect
            if (def.id === 'TableSelect' && isExpress) continue;

            results.push({
                id: `missing-${def.id}`,
                severity: 'error',
                message: `Missing "${def.name}"`,
                suggestion: getMissingSuggestion(def),
                componentId: def.id,
            });
        }
    }

    // Rule 3: Conflicting components
    for (const [componentId, { zoneIds }] of Array.from(componentCounts.entries())) {
        const def = getComponentDef(componentId);
        if (!def?.conflicts) continue;
        for (const conflictId of def.conflicts) {
            const conflictEntry = componentCounts.get(conflictId);
            if (conflictEntry && conflictEntry.count > 0) {
                const conflictDef = getComponentDef(conflictId);
                // Only report once (from the first component alphabetically)
                if (componentId < conflictId) {
                    results.push({
                        id: `conflict-${componentId}-${conflictId}`,
                        severity: 'error',
                        message: `"${def.name}" conflicts with "${conflictDef?.name ?? conflictId}"`,
                        suggestion: `Use either "${def.name}" or "${conflictDef?.name ?? conflictId}", not both`,
                        affectedZones: [...zoneIds, ...conflictEntry.zoneIds],
                        componentId,
                    });
                }
            }
        }
    }

    // Rule 4: No payment method at all
    if (layoutType === 'pos') {
        const hasPayment = ['PayCash', 'PayCard', 'PaySplit', 'QuickPay'].some(
            id => (componentCounts.get(id)?.count ?? 0) > 0
        );
        if (!hasPayment) {
            results.push({
                id: 'no-payment',
                severity: 'warning',
                message: 'No payment buttons — how will customers pay?',
                suggestion: 'Add at least PayCash or PayCard, or use QuickPay for Express mode',
            });
        }
    }

    // Rule 5: No send button
    if (layoutType === 'pos') {
        const hasSend = (componentCounts.get('SendButton')?.count ?? 0) > 0;
        if (!hasSend) {
            results.push({
                id: 'no-send',
                severity: 'warning',
                message: 'No Send button — orders cannot reach the kitchen',
                suggestion: 'Add a SendButton with Kitchen or Bar variant',
            });
        }
    }

    // Rule 6: Express-specific tips
    if (isExpress) {
        const hasTableSelect = (componentCounts.get('TableSelect')?.count ?? 0) > 0;
        if (hasTableSelect) {
            results.push({
                id: 'express-table',
                severity: 'info',
                message: 'Express mode doesn\'t typically need a Table Selector',
                suggestion: 'Express is counter-service — consider removing TableSelect',
                componentId: 'TableSelect',
            });
        }
    }

    // Rule 7: Non-express without table select
    if (layoutType === 'pos' && !isExpress) {
        const hasTableSelect = (componentCounts.get('TableSelect')?.count ?? 0) > 0;
        if (!hasTableSelect) {
            results.push({
                id: 'no-table',
                severity: 'warning',
                message: 'No Table Selector — staff cannot assign orders to tables',
                suggestion: 'Add a TableSelect component (Grid or Floor Plan variant)',
                componentId: 'TableSelect',
            });
        }
    }

    // Rule 8: Duplicate variant check (same SendButton variant used twice)
    const sendZones = zones.filter(z => z.component === 'SendButton' && z.visible);
    if (sendZones.length > 1) {
        const variantCounts = new Map<string, string[]>();
        for (const z of sendZones) {
            const variant = (z.config?.variant as string) || z.variant || 'kitchen';
            const entry = variantCounts.get(variant) || [];
            entry.push(z.id);
            variantCounts.set(variant, entry);
        }
        for (const [variant, ids] of Array.from(variantCounts.entries())) {
            if (ids.length > 1) {
                results.push({
                    id: `dup-send-variant-${variant}`,
                    severity: 'error',
                    message: `${ids.length}× Send "${variant}" — duplicate send destination`,
                    suggestion: `Each send variant should only appear once. Remove one "${variant}" SendButton.`,
                    affectedZones: ids,
                    componentId: 'SendButton',
                });
            }
        }
    }

    return results;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getMissingSuggestion(def: ZoneComponentDef): string {
    switch (def.id) {
        case 'ItemGrid':
            return 'Without an Item Grid, users cannot see or select menu items!';
        case 'OrderPanel':
            return 'Without an Order Panel, users cannot see their current order!';
        case 'CategoryBar':
            return 'Without categories, users must scroll through all items!';
        case 'TopBar':
            return 'The Top Bar shows table info and search — recommended for all layouts';
        case 'TotalsDisplay':
            return 'Without totals, users cannot see order pricing!';
        case 'SendButton':
            return 'Add a Send button so orders can reach the kitchen or bar';
        default:
            return `Add "${def.name}" to your layout`;
    }
}

// ─── Summary Helpers ─────────────────────────────────────────────

export function getValidationSummary(results: ValidationResult[]) {
    return {
        errors: results.filter(r => r.severity === 'error').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        infos: results.filter(r => r.severity === 'info').length,
        hasErrors: results.some(r => r.severity === 'error'),
        total: results.length,
    };
}

/**
 * Returns true if the layout is safe to save (no errors).
 * Warnings are allowed.
 */
export function canSaveLayout(results: ValidationResult[]): boolean {
    return !results.some(r => r.severity === 'error');
}
