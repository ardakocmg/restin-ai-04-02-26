/**
 * VirtualizedList — Reusable Windowed List Component
 * @module components/shared/VirtualizedList
 *
 * Rule I.6: Virtualize all lists > 50 items.
 *
 * Uses @tanstack/react-virtual (same as DataTable) for consistency.
 * For use outside of DataTable (e.g., chat messages, feeds, notification lists).
 *
 * Usage:
 *   <VirtualizedList
 *     items={messages}
 *     itemHeight={64}
 *     renderItem={(item, index) => <MessageRow key={index} message={item} />}
 *   />
 */
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const VIRTUALIZATION_THRESHOLD = 50;

interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    height?: number;
    className?: string;
    overscan?: number;
    forceVirtualize?: boolean;
}

export default function VirtualizedList<T>({
    items,
    itemHeight,
    renderItem,
    height = 480,
    className,
    overscan = 8,
    forceVirtualize = false,
}: VirtualizedListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const shouldVirtualize = forceVirtualize || items.length > VIRTUALIZATION_THRESHOLD;

    // For small lists, render normally (no virtualization overhead)
    if (!shouldVirtualize) {
        return (
            <div className={className}>
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {renderItem(item, index)}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // For large lists, use windowed rendering via @tanstack/react-virtual
    return (
        <VirtualizedInner
            containerRef={containerRef}
            items={items}
            itemHeight={itemHeight}
            renderItem={renderItem}
            height={height}
            className={className}
            overscan={overscan}
        />
    );
}

/** Inner component to use the virtualizer hook properly */
function VirtualizedInner<T>({
    containerRef,
    items,
    itemHeight,
    renderItem,
    height,
    className,
    overscan,
}: {
    containerRef: React.RefObject<HTMLDivElement>;
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    height: number;
    className?: string;
    overscan: number;
}) {
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => itemHeight,
        overscan,
    });

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ height, overflow: 'auto' }} /* keep-inline */ /* keep-inline */
        >
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => (
                    <div
                        key={virtualRow.key}
                        style={{ /* keep-inline */ /* keep-inline */
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                    >
                        {renderItem(items[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export { VIRTUALIZATION_THRESHOLD };
export type { VirtualizedListProps };
