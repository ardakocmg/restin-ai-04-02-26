import React, { ElementType } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: ElementType;
  title?: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  description = 'There is no data to display',
  action,
  actionLabel,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-4 animate-in fade-in zoom-in-95 duration-300', className)}
      style={{ minHeight: '300px' }} /* keep-inline */ /* keep-inline */
    >
      <div className="p-4 bg-card/50 rounded-full border border-border mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <Icon className="w-12 h-12 text-muted-foreground drop-shadow-md" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && actionLabel && (
        <Button onClick={action} variant="outline" className="border-border hover:bg-white/5 text-secondary-foreground">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
