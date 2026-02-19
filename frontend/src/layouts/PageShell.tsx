import React from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface PageShellProps {
    /** Page content */
    children: React.ReactNode;
    /** Additional wrapper className */
    className?: string;
    /** Page title — uses standardized Command Bar header */
    title?: React.ReactNode;
    /** Subtitle / description text */
    description?: string;
    /** Right-side action buttons (e.g. Add, Export) */
    actions?: React.ReactNode;
    /** Filter strip — renders below the title row */
    filters?: React.ReactNode;
    /** Show current date/time in header (default: true) */
    showDate?: boolean;
    /** Tab bar — renders below filters for in-page navigation */
    tabs?: React.ReactNode;
    /** Custom ID for automated testing */
    id?: string;
}

/**
 * Unified page wrapper for all admin pages.
 * Replaces both `PageLayout.tsx` and `PageContainer.jsx`.
 *
 * Features:
 * - Sticky Command Bar header with title, actions, and date
 * - Optional filter strip
 * - Optional tab bar
 * - Consistent padding and animation
 * - Fully dark-mode native (zinc palette)
 *
 * Usage:
 * ```tsx
 * <PageShell
 *   title="HR & People"
 *   description="Manage your team"
 *   actions={<Button>Add Employee</Button>}
 *   filters={<DatePicker />}
 * >
 *   {content}
 * </PageShell>
 * ```
 */
export default function PageShell({
    children,
    className,
    title,
    description,
    actions,
    filters,
    showDate = true,
    tabs,
    id,
}: PageShellProps) {
    const hasHeader = title || actions || showDate;

    return (
        <div
            id={id}
            className={cn('min-h-full flex flex-col', className)}
        >
            {/* ─── Command Bar (Page Header) ──────────────────────────── */}
            {hasHeader && (
                <div className="sticky top-0 z-10 border-b border-border backdrop-blur-xl bg-background/80 transition-all duration-200">
                    {/* Main Row: Title + Actions */}
                    <div className="px-6 py-4 flex items-start justify-between gap-4">
                        {/* Left: Title & Description */}
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground leading-tight">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="mt-1 text-sm font-medium text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Right: Date + Actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            {showDate && (
                                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                    {format(new Date(), 'dd/MM/yyyy HH:mm')}
                                </div>
                            )}
                            {actions && (
                                <div className="flex items-center gap-2">
                                    {actions}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Strip */}
                    {filters && (
                        <div className="px-6 pb-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                            {filters}
                        </div>
                    )}

                    {/* Tab Bar */}
                    {tabs && (
                        <div className="px-6 border-t border-border">
                            {tabs}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Page Content ───────────────────────────────────────── */}
            <div className="flex-1 px-6 py-6 animate-in fade-in duration-300">
                {children}
            </div>
        </div>
    );
}
