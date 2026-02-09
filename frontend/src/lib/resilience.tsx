/**
 * 🌪️ Chaos Testing & Graceful Error Handling — Rule 28
 * Frontend must handle random API latency/failures gracefully.
 * 
 * Also provides a VirtualizedList component — Rule 6
 * Virtualize all lists > 50 items.
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';

// ──────────────────────────────────────
// CHAOS TESTING (dev-only)
// ──────────────────────────────────────

interface ChaosConfig {
    enabled: boolean;
    failRate: number;       // 0-1, probability of fake failure
    latencyMin: number;     // ms
    latencyMax: number;     // ms
}

const defaultChaosConfig: ChaosConfig = {
    enabled: false,
    failRate: 0.1,
    latencyMin: 200,
    latencyMax: 3000,
};

let chaosConfig = { ...defaultChaosConfig };

/** Enable chaos testing (call from dev console) */
(window as Record<string, unknown>).__enableChaos = (config?: Partial<ChaosConfig>) => {
    chaosConfig = { ...defaultChaosConfig, ...config, enabled: true };
    console.warn('🌪️ Chaos testing ENABLED:', chaosConfig);
};

(window as Record<string, unknown>).__disableChaos = () => {
    chaosConfig = { ...defaultChaosConfig, enabled: false };
    console.warn('🌪️ Chaos testing DISABLED');
};

/**
 * Inject chaos into fetch requests (for testing resilience).
 * Wrap your API calls with this in dev mode.
 */
export async function withChaos<T>(fn: () => Promise<T>): Promise<T> {
    if (!chaosConfig.enabled) return fn();

    // Random delay
    const delay = Math.random() * (chaosConfig.latencyMax - chaosConfig.latencyMin) + chaosConfig.latencyMin;
    await new Promise(r => setTimeout(r, delay));

    // Random failure
    if (Math.random() < chaosConfig.failRate) {
        throw new Error(`🌪️ Chaos: Simulated API failure (${Math.round(delay)}ms delay)`);
    }

    return fn();
}

// ──────────────────────────────────────
// VIRTUALIZED LIST — Rule 6
// ──────────────────────────────────────

interface VirtualizedListProps<T> {
    items: T[];
    rowHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
}

/**
 * Virtualized list for rendering 50+ items efficiently.
 * Only renders visible items + overscan buffer.
 */
export function VirtualizedList<T>({
    items,
    rowHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    className = '',
}: VirtualizedListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = items.length * rowHeight;
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * rowHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    return React.createElement('div', {
        ref: containerRef,
        className,
        onScroll: handleScroll,
        style: {
            height: containerHeight,
            overflow: 'auto',
            position: 'relative' as const,
        },
    },
        React.createElement('div', {
            style: {
                height: totalHeight,
                position: 'relative' as const,
            },
        },
            React.createElement('div', {
                style: {
                    position: 'absolute' as const,
                    top: offsetY,
                    left: 0,
                    right: 0,
                },
            },
                visibleItems.map((item, idx) =>
                    React.createElement('div', {
                        key: startIndex + idx,
                        style: { height: rowHeight },
                    }, renderItem(item, startIndex + idx))
                )
            )
        )
    );
}

// ──────────────────────────────────────
// ERROR BOUNDARY — Rule 62 (companion)
// ──────────────────────────────────────

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    moduleName: string;
}

interface ErrorBoundaryProps {
    moduleName: string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
    onError?: (error: Error, moduleName: string) => void;
}

/**
 * Module-level Error Boundary.
 * Catch failures in one module without crashing the entire app.
 * "Chat death ≠ POS death" — Rule 62
 */
export class ModuleErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, moduleName: props.moduleName };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error): void {
        this.props.onError?.(error, this.props.moduleName);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return React.createElement('div', {
                className: 'flex flex-col items-center justify-center p-8 text-center bg-card border border-border rounded-xl',
            },
                React.createElement('div', { className: 'text-4xl mb-3' }, '⚠️'),
                React.createElement('h3', { className: 'font-semibold text-foreground mb-1' },
                    `${this.props.moduleName} encountered an error`
                ),
                React.createElement('p', { className: 'text-sm text-muted-foreground mb-4' },
                    this.state.error?.message || 'An unexpected error occurred'
                ),
                React.createElement('button', {
                    onClick: this.handleRetry,
                    className: 'px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity',
                }, 'Retry Module')
            );
        }

        return this.props.children;
    }
}

export { chaosConfig };
export type { ChaosConfig, VirtualizedListProps };
