/**
 * AppProviders — Consolidated provider tree for the entire application.
 * 
 * Instead of 12 levels of nesting in App.tsx, this component composes all
 * providers in the correct dependency order using a helper that flattens
 * them into a single wrapper.
 * 
 * Order matters — later providers can consume earlier ones:
 *   Auth → MultiVenue → Venue → DesignSystem → Subdomain → UserSettings
 *   → Theme → UI → POSFilter
 * 
 * Router-dependent providers (Runtime, SafeMode) stay inside <BrowserRouter>.
 * 
 * @module context/AppProviders
 */
import React, { ReactNode } from 'react';

import { AuthProvider } from '../features/auth/AuthContext';
import { MultiVenueProvider } from './MultiVenueContext';
import { VenueProvider } from './VenueContext';
import { DesignSystemProvider } from './DesignSystemContext';
import { SubdomainProvider } from './SubdomainContext';
import { UserSettingsProvider } from './UserSettingsContext';
import { ThemeProvider } from './ThemeContext';
import { UIProvider } from './UIContext';
import { POSFilterProvider } from './POSFilterContext';

// ─── Helper: compose providers without deep nesting ──────────────────────────
type ProviderComponent = React.FC<{ children: ReactNode }>;

function composeProviders(providers: ProviderComponent[]): ProviderComponent {
    return providers.reduce(
        (Composed, Current) =>
            ({ children }: { children: ReactNode }) => (
                <Composed>
                    <Current>{children}</Current>
                </Composed>
            ),
        ({ children }: { children: ReactNode }) => <>{children}</>
    );
}

// ─── Provider order (dependency-respecting) ──────────────────────────────────
// Each provider can use hooks from all providers ABOVE it in this list.
const PROVIDERS: ProviderComponent[] = [
    AuthProvider,
    MultiVenueProvider,
    VenueProvider,
    DesignSystemProvider,
    SubdomainProvider,
    UserSettingsProvider,
    ThemeProvider,
    UIProvider,
    POSFilterProvider,
];

const ComposedProviders = composeProviders(PROVIDERS);

// ─── Export ──────────────────────────────────────────────────────────────────
interface AppProvidersProps {
    children: ReactNode;
}

/**
 * Wrap the entire app with all non-router-dependent providers.
 * Router-dependent providers (RuntimeProvider, SafeModeProvider) must be
 * placed INSIDE <BrowserRouter> separately.
 */
export function AppProviders({ children }: AppProvidersProps): React.ReactElement {
    return <ComposedProviders>{children}</ComposedProviders>;
}

/**
 * Router-dependent providers — must live inside <BrowserRouter>.
 * Separated because they rely on useLocation() and other Router hooks.
 */
export { RuntimeProvider } from './RuntimeContext';
export { SafeModeProvider } from './SafeModeContext';
