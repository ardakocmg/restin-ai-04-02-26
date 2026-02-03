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
      className={cn('flex flex-col items-center justify-center py-12 px-4', className)}
      style={{ minHeight: '300px' }}
    >
      <Icon 
        className="w-16 h-16 mb-4"
        style={{ color: '#71717A' }}
      />
      <h3 
        className="text-lg font-semibold mb-2"
        style={{ color: '#D4D4D8' }}
      >
        {title}
      </h3>
      <p 
        className="text-sm text-center max-w-sm mb-6"
        style={{ color: '#A1A1AA' }}
      >
        {description}
      </p>
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
