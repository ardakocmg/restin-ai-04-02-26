/**
 * POS Theme Router
 * Renders the appropriate POS component based on the active theme from the Theme Engine.
 * 
 * Supported engines:
 * - l-series: POSRuntimeEnhanced (Lightspeed L-Series clone)
 * - k-series: POSRuntimeKSeries (Lightspeed K-Series clone — standalone 5th engine)
 * - restin:   POSMain (Classic Restin.AI via POSLayoutRestin)
 * - pro:      POSMain (iPad full-service via POSLayoutPro)
 * - express:  POSMain (Quick service via POSLayoutExpress)
 */
import { getActiveTheme } from '@/features/pos/themes/builtinThemes';
import type { POSLayoutEngine } from '@/features/pos/themes/posThemeTypes';
import React,{ Suspense } from 'react';

const POSMain = React.lazy(() => import('./POSMain'));
const POSRuntimeEnhanced = React.lazy(() => import('./POSRuntimeEnhanced'));
const POSRuntimeKSeries = React.lazy(() => import('./POSRuntimeKSeries'));

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
    <div style={{ /* keep-inline */
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', backgroundColor: '#000', color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
     /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
        <div style={{ textAlign: 'center'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
            <div style={{ fontSize: 48, marginBottom: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>🔥</div>
            <div style={{ color: '#888', fontSize: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{"Loading "}POS...</div>
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
            {engine === 'k-series' && <POSRuntimeKSeries />}
            {(engine === 'restin' || engine === 'pro' || engine === 'express') && <POSMain />}
            {engine === 'custom' && <POSRuntimeEnhanced />}
        </Suspense>
    );
}
