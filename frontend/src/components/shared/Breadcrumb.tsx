import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
    className?: string;
}

/**
 * Premium animated breadcrumb strip.
 * Automatically resolves the current route against the navigation registry.
 *
 * Design: macOS Finder path bar — clickable, animated, contextual.
 */
export default function Breadcrumb({ className }: BreadcrumbProps) {
    const segments = useBreadcrumb();

    if (segments.length <= 1) return null; // Don't show for just "Home"

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn(
                'flex items-center gap-1 text-xs font-medium select-none overflow-x-auto scrollbar-none',
                className
            )}
        >
            {segments.map((seg, idx) => {
                const Icon = seg.icon;
                const isLast = seg.isLast;

                return (
                    <React.Fragment key={seg.href + idx}>
                        {/* Separator */}
                        {idx > 0 && (
                            <ChevronRight
                                className="w-3 h-3 text-zinc-600 shrink-0 mx-0.5 transition-transform duration-200"
                                aria-hidden
                            />
                        )}

                        {/* Segment */}
                        {isLast ? (
                            <span
                                className={cn(
                                    'flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors duration-200',
                                    'text-zinc-200 font-bold bg-white/[0.04] border border-white/[0.06]'
                                )}
                                aria-current="page"
                            >
                                {Icon && <Icon className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                                <span className="truncate max-w-[160px]">{seg.label}</span>
                            </span>
                        ) : (
                            <Link
                                to={seg.href}
                                className={cn(
                                    'flex items-center gap-1.5 py-1 px-2 rounded-md transition-all duration-200',
                                    'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]',
                                    idx === 0 && 'text-zinc-600'
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
    );
}
