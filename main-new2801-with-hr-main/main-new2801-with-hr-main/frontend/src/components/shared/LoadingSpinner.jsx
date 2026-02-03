import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoadingSpinner({ 
  size = 'default', 
  text = 'Loading...', 
  fullScreen = false,
  className 
}) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 
        className={cn('animate-spin', sizes[size])}
        style={{ color: '#E53935' }}
      />
      {text && (
        <p className="text-sm" style={{ color: '#A1A1AA' }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: '#0A0A0B' }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
