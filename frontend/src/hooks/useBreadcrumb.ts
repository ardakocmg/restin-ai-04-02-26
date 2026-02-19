import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MENU_ITEMS, DOMAINS, getDomainForGroup, type MenuItem } from '@/lib/searchRegistry';
import { Home, type LucideIcon } from 'lucide-react';

export interface BreadcrumbSegment {
    label: string;
    href: string;
    icon?: LucideIcon;
    isLast: boolean;
}

/**
 * Resolves the current URL into an array of breadcrumb segments
 * by matching against the centralized searchRegistry.
 *
 * Example output for `/manager/hr/clocking`:
 * [
 *   { label: 'Home',        href: '/manager',            icon: Home,  isLast: false },
 *   { label: 'HR & People', href: '/manager/hr',         icon: Users, isLast: false },
 *   { label: 'Clocking',    href: '/manager/hr/clocking', icon: Clock, isLast: true  },
 * ]
 */
export function useBreadcrumb(): BreadcrumbSegment[] {
    const location = useLocation();

    return useMemo(() => {
        const pathname = location.pathname;
        const segments: BreadcrumbSegment[] = [];

        // 1. Always start with Home
        segments.push({
            label: 'Home',
            href: '/manager',
            icon: Home,
            isLast: false,
        });

        if (pathname === '/manager' || pathname === '/manager/') {
            segments[0].isLast = true;
            return segments;
        }

        // 2. Find the matching menu item (direct or child) 
        let matchedItem: MenuItem | undefined;
        let matchedChild: MenuItem | undefined;

        for (const item of MENU_ITEMS) {
            // Direct match
            if (item.href === pathname) {
                matchedItem = item;
                break;
            }
            // Child match
            if (item.children) {
                const child = item.children.find(c => c.href === pathname);
                if (child) {
                    matchedItem = item;
                    matchedChild = child;
                    break;
                }
            }
        }

        // 3. If we found a match, build the crumbs
        if (matchedItem) {
            // Add domain segment
            const domainId = getDomainForGroup(matchedItem.group);
            const domain = DOMAINS.find(d => d.id === domainId);
            if (domain && domainId !== 'home') {
                segments.push({
                    label: domain.title,
                    href: matchedItem.href || '/manager',
                    icon: domain.icon,
                    isLast: false,
                });
            }

            // If matched a child, add parent then child
            if (matchedChild) {
                if (matchedItem.href) {
                    segments.push({
                        label: matchedItem.title,
                        href: matchedItem.href,
                        icon: matchedItem.icon,
                        isLast: false,
                    });
                }
                segments.push({
                    label: matchedChild.title,
                    href: matchedChild.href || pathname,
                    icon: matchedChild.icon,
                    isLast: true,
                });
            } else {
                // Direct item match
                segments.push({
                    label: matchedItem.title,
                    href: matchedItem.href || pathname,
                    icon: matchedItem.icon,
                    isLast: true,
                });
            }
        } else {
            // 4. Fallback: parse pathname segments for unregistered routes
            //    e.g. /manager/hr/people/abc123 → HR & People > People > abc123
            const parts = pathname.replace('/manager/', '').split('/').filter(Boolean);

            // Try matching the first part(s) to build partial crumbs
            let partialPath = '/manager';
            for (let i = 0; i < parts.length; i++) {
                partialPath += `/${parts[i]}`;
                const isLast = i === parts.length - 1;

                // Check if this partial path matches any item
                const partialMatch = MENU_ITEMS.find(m => m.href === partialPath)
                    || MENU_ITEMS.flatMap(m => m.children || []).find(c => c.href === partialPath);

                if (partialMatch) {
                    segments.push({
                        label: partialMatch.title,
                        href: partialMatch.href || partialPath,
                        icon: partialMatch.icon,
                        isLast,
                    });
                } else {
                    // Humanize the URL segment (kebab-case → Title Case)
                    const label = parts[i]
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
                    segments.push({
                        label,
                        href: partialPath,
                        isLast,
                    });
                }
            }
        }

        // Mark the last segment
        segments.forEach((seg, i) => {
            seg.isLast = i === segments.length - 1;
        });

        return segments;
    }, [location.pathname]);
}
