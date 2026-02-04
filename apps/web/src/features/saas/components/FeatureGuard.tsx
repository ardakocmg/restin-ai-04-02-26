import React from 'react';

// Rule #47: SaaS Gating - Code-level feature locking

type PlanLevel = 'BASIC' | 'PRO' | 'ENTERPRISE';

const PLAN_FEATURES: Record<PlanLevel, string[]> = {
    BASIC: ['pos', 'inventory'],
    PRO: ['pos', 'inventory', 'kds', 'hive'],
    ENTERPRISE: ['pos', 'inventory', 'kds', 'hive', 'franchise', 'api']
};

interface FeatureGuardProps {
    feature: string;
    currentPlan: PlanLevel;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function FeatureGuard({ feature, currentPlan, children, fallback }: FeatureGuardProps) {
    const allowed = PLAN_FEATURES[currentPlan]?.includes(feature);

    if (allowed) return <>{children}</>;

    if (fallback) return <>{fallback}</>;

    return (
        <div className="p-4 border border-yellow-500 bg-yellow-500/10 rounded text-yellow-500 text-sm">
            🔒 Upgrade to PRO to unlock {feature}
        </div>
    );
}
