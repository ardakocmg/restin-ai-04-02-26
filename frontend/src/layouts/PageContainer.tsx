import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer — Minimal page wrapper.
 *
 * The page header (title, description, back button, actions) has been
 * removed because contextual actions now live in the Breadcrumb bar
 * (via useBreadcrumbActions). This keeps a single top bar and avoids
 * duplicate UI for action buttons.
 *
 * Props `title`, `description`, and `actions` are kept in the signature
 * for backward compatibility but are no longer rendered.
 */
export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
  [key: string]: unknown; // Accept any extra props for backward compat
}

export default function PageContainer({ children, className = '', title, description, actions }: PageContainerProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Page Content — no header, actions moved to breadcrumb bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </div>
    </div>
  );
}
