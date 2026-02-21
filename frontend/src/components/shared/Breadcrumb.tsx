import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import { useBreadcrumbActions,type BreadcrumbAction } from '@/hooks/useBreadcrumbActions';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link,useNavigate } from 'react-router-dom';

interface BreadcrumbProps {
    className?: string;
}

/**
 * Premium animated breadcrumb strip with contextual quick-actions.
 * Automatically resolves the current route against the navigation registry.
 *
 * Design: macOS Finder path bar — clickable, animated, contextual.
 * Right side: route-aware action buttons (Export, Add New, etc.)
 */
export default function Breadcrumb({ className }: BreadcrumbProps) {
    const segments = useBreadcrumb();
    const actions = useBreadcrumbActions();
    const navigate = useNavigate();

    if (segments.length <= 1 && actions.length === 0) return null;

    const handleAction = (action: BreadcrumbAction) => {
        if (action.href) {
            navigate(action.href);
        } else {
            // Emit a custom event that page components can listen to
            const event = new CustomEvent('breadcrumb-action', { detail: { actionId: action.id } });
            window.dispatchEvent(event);
            logger.debug('Breadcrumb action triggered', { actionId: action.id });
        }
    };

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-2',
                className
            )}
        >
            {/* Left: Breadcrumb segments */}
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1 text-xs font-medium select-none overflow-x-auto scrollbar-none"
            >
                {segments.map((seg, idx) => {
                    const Icon = seg.icon;
                    const isLast = seg.isLast;

                    return (
                        <React.Fragment key={seg.href + idx}>
                            {idx > 0 && (
                                <ChevronRight
                                    className="w-3 h-3 text-muted-foreground shrink-0 mx-0.5 transition-transform duration-200"
                                    aria-hidden
                                />
                            )}

                            {isLast ? (
                                <span
                                    className={cn(
                                        'flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors duration-200',
                                        'text-secondary-foreground font-bold bg-white/[0.04] border border-white/[0.06]'
                                    )}
                                    aria-current="page"
                                >
                                    {Icon && <Icon className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                                    <span className="truncate max-w-40">{seg.label}</span>
                                </span>
                            ) : (
                                <Link
                                    to={seg.href}
                                    className={cn(
                                        'flex items-center gap-1.5 py-1 px-2 rounded-md transition-all duration-200',
                                        'text-muted-foreground hover:text-secondary-foreground hover:bg-white/[0.04]',
                                        idx === 0 && 'text-muted-foreground'
                                    )}
                                >
                                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                                    <span className="truncate max-w-[120px]">{seg.label}</span>
                                </Link>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>

            {/* Right: Contextual quick-actions */}
            {actions.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                    {actions.map((action) => {
                        const ActionIcon = action.icon;
                        return (
                            <button
                                key={action.id}
                                onClick={() => handleAction(action)}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border outline-none',
                                    action.variant === 'primary' && 'bg-red-600/90 hover:bg-red-600 text-foreground border-red-500/30 shadow-[0_0_12px_rgba(220,38,38,0.2)]',
                                    action.variant === 'default' && 'bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-secondary-foreground border-white/[0.06]',
                                    action.variant === 'ghost' && 'bg-transparent hover:bg-white/[0.04] text-muted-foreground hover:text-secondary-foreground border-transparent',
                                )}
                            >
                                <ActionIcon className="w-3 h-3" />
                                <span className="hidden sm:inline">{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
