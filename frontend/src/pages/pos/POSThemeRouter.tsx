/**
 * POS Theme Router
 * Renders the appropriate POS component based on the active theme from the Theme Engine.
 * 
 * Supported engines:
 * - l-series: POSRuntimeEnhanced (Lightspeed clone)
 * - restin:   POSMain (Classic Restin.AI via POSLayoutRestin)
 * - pro:      POSMain (iPad full-service via POSLayoutPro)
 * - express:  POSMain (Quick service via POSLayoutExpress)
 */
import React, { Suspense } from 'react';
import { getActiveTheme } from '@/features/pos/themes/builtinThemes';
import type { POSLayoutEngine } from '@/features/pos/themes/posThemeTypes';

const POSMain = React.lazy(() => import('./POSMain'));
const POSRuntimeEnhanced = React.lazy(() => import('./POSRuntimeEnhanced'));

export type POSTheme = 'restin' | 'l-series' | 'k-series';

/** Legacy compat — still used by some components */
export function getPOSTheme(): POSTheme {
    const activeTheme = getActiveTheme();
    if (activeTheme.engine === 'l-series') return 'l-series';
    return 'restin';
}

/** Legacy compat */
export function setPOSTheme(theme: POSTheme): void {
    localStorage.setItem('pos_theme', theme);
}

const LoadingFallback = () => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', backgroundColor: '#000', color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
            <div style={{ color: '#888', fontSize: 16 }}>Loading POS...</div>
        </div>
    </div>
);

export default function POSThemeRouter() {
    const activeTheme = getActiveTheme();
    const engine: POSLayoutEngine = activeTheme.engine;

    // Store the active layout engine so POSMain can pick the right layout component
    localStorage.setItem('pos_layout', engine);

    return (
        <Suspense fallback={<LoadingFallback />}>
            {engine === 'l-series' && <POSRuntimeEnhanced />}
            {(engine === 'restin' || engine === 'pro' || engine === 'express') && <POSMain />}
            {engine === 'custom' && <POSRuntimeEnhanced />}
        </Suspense>
    );
}
