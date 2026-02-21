import { format } from 'date-fns';
import React from 'react';
import { cn } from '../lib/utils';

interface PageLayoutProps {
    children: React.ReactNode;
    className?: string;
    title?: React.ReactNode;
    description?: string;
    actions?: React.ReactNode;
    filters?: React.ReactNode;
    showDate?: boolean;
}

export default function PageLayout({
    children,
    className,
    title,
    description,
    actions,
    filters,
    showDate = true,
}: PageLayoutProps) {
    return (
        <div className={cn('min-h-full flex flex-col', className)}>
            {/* Command Bar (Page Header) */}
            {(title || actions || showDate) && (
                <div
                    className="sticky top-0 z-10 px-6 py-4 flex flex-col gap-4 border-b border-border backdrop-blur-xl bg-background/80 transition-all duration-200"
                >
                    <div className="flex items-start justify-between gap-4">
                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="mt-1 text-sm font-medium text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Right Side: Date & Actions */}
                        <div className="flex flex-col items-end gap-2">
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

                    {/* Control Strip (Filters) */}
                    {filters && (
                        <div className="flex items-center gap-2 pt-2 animate-in slide-in-from-top-2 duration-200">
                            {filters}
                        </div>
                    )}
                </div>
            )}

            {/* Page Content */}
            <div className="flex-1 px-6 py-6 animate-in fade-in duration-300">
                {children}
            </div>
        </div>
    );
}
