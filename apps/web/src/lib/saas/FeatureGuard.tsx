import React, { createContext, useContext, useState } from 'react';
import { Button } from '@antigravity/ui';
import type { FeatureFlags } from '@antigravity/config';

// Rule #47: SaaS Gating

const FeatureContext = createContext<FeatureFlags | null>(null);

// Mock Config for Context Provider (Real app would fetch from Organization)
export const FeatureProvider = ({ children, features }: { children: React.ReactNode, features: FeatureFlags }) => {
    return (
        <FeatureContext.Provider value={features}>
            {children}
        </FeatureContext.Provider>
    );
};

export const useFeature = (key: keyof FeatureFlags) => {
    const features = useContext(FeatureContext);

    // Default to false (Secure by Default)
    const isEnabled = features ? features[key] : false;

    return isEnabled;
};

interface FeatureGuardProps {
    feature: keyof FeatureFlags;
    children: React.ReactNode;
    fallback?: React.ReactNode; // Content to show if locked
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, fallback }) => {
    const isEnabled = useFeature(feature);
    const [showModal, setShowModal] = useState(false);

    if (isEnabled) {
        return <>{children}</>;
    }

    // Default Fallback: Upgrade Modal Trigger
    if (fallback) return <>{fallback}</>;

    return (
        <div className="relative group cursor-not-allowed">
            <div className="opacity-50 pointer-events-none grayscale" aria-hidden="true">
                {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="default"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 border-none shadow-xl"
                    onClick={() => setShowModal(true)}
                >
                    🔒 Upgrade to Pro
                </Button>
            </div>

            {/* Simulated Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-purple-500/30 p-8 rounded-2xl max-w-md text-center shadow-2xl">
                        <div className="text-4xl mb-4">🚀</div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                            Unlock {feature}
                        </h2>
                        <p className="text-zinc-400 mb-6">
                            This feature is available on the <strong>Business Plan</strong>.
                            Boost your efficiency with AI Copilot, Inventory Intelligence, and more.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>Maybe Later</Button>
                            <Button className="bg-purple-600 hover:bg-purple-500 text-white">View Plans</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
