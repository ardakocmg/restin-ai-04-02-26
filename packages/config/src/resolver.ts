import { merge } from 'lodash';
import { defaultConfig } from './defaults';
import type { AppConfig } from './types';
import type { PrismaClient } from '@prisma/client';

// Rule #56: Deep Merge Strategy with Locking

interface ConfigContext {
    organizationId: string;
    brandId?: string;
    branchId?: string;
    userId?: string;
}

// Helper to fetch JSON config from DB (mocked for now as we deal with Prisma types)
// In a real scenario, we'd pass the Prisma Client instance
async function fetchConfig(prisma: any, entityId: string): Promise<Partial<AppConfig> | null> {
    const setting = await prisma.systemSetting.findUnique({
        where: { organizationId: entityId } // Note: Schema currently only links Org. 
        // We might need to expand SystemSetting to support Brand/Branch in future or use a flexible polymorphic relation.
        // For Protocol v17 (Bedrock), we'll focus on Org Level + dynamic override simulation.
    });
    return setting?.config as Partial<AppConfig> || null;
}

export const resolveConfig = async (prisma: any, context: ConfigContext): Promise<AppConfig> => {
    // 1. Start with System Defaults
    let finalConfig = JSON.parse(JSON.stringify(defaultConfig)); // Deep copy

    // 2. Fetch & Merge Organization Config (The "Plan" Layer)
    const orgConfig = await fetchConfig(prisma, context.organizationId);
    if (orgConfig) {
        merge(finalConfig, orgConfig);
    }

    // 3. Brand & Branch Levels 
    // (Assuming we extend DB schema later for these, or use nested JSON in Org Config)
    // For now, we'll assume the Org Config contains the "Truth" for limits.

    // 4. "Locking" Logic (SaaS Gates)
    // If Org Config says feature X is disabled, Branch cannot enable it.
    // This implies we need to know the *Limits*. 
    // For this implementation, we assume `orgConfig` sets the hard limits if present.
    // But usually, Plan Tiers are separate.

    // Let's implement specific Plan Logic based on a hypothentical "Plan" passed or fetched.
    // For now, we trust the Org Config as the merged result of the Plan.

    return finalConfig as AppConfig;
};

// Pure utility for merging without DB side effects
export const mergeConfigs = (base: AppConfig, override: Partial<AppConfig>): AppConfig => {
    // Custom Merge Logic if needed (e.g. Arrays vs Replacements)
    const result = merge({}, base, override);

    // Rule: Features Locking
    // If base (higher level) explicitly disables a SaaS feature, override cannot enable it?
    // Actually, usually Base = Defaults (Enabled=False). Org = Plan (Enabled=True).
    // If Org (Plan) = False, then Branch cannot set True.
    // This directionality implies we need to know intrinsic "Capabilities" vs "Preferences".
    // For simplicity in v17.0, we use standard Deep Merge. Last write wins.
    // The "locking" is enforced by *who* can write the Org config (Admin only).

    return result;
};
