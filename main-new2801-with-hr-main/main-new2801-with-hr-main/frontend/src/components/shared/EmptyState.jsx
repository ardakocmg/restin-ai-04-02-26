import React from 'react';
import { FileX, Inbox, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  description = 'There is no data to display',
  action,
  actionLabel,
  className
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-4 animate-in fade-in zoom-in-95 duration-300', className)}
      style={{ minHeight: '300px' }}
    >
      <div className="p-4 bg-zinc-900/50 rounded-full border border-white/5 mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <Icon className="w-12 h-12 text-zinc-600 drop-shadow-md" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-zinc-500 text-center max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && actionLabel && (
        <Button onClick={action} variant="outline" className="border-white/10 hover:bg-white/5 text-zinc-300">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
