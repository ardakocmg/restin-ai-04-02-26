import React from 'react';
import { cn } from '@/lib/utils';

export default function PageContainer({ children, className, title, description, actions }) {
  return (
    <div className={cn('min-h-screen', className)} style={{ backgroundColor: '#0A0A0B' }}>
      {/* Page Header */}
      {(title || actions) && (
        <div
          className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
          style={{
            backgroundColor: '#18181B',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              {title && (
                <h1
                  className="text-2xl sm:text-3xl font-black uppercase tracking-tighter"
                  style={{ color: '#FFFFFF' }}
                >
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-1 text-sm font-medium italic" style={{ color: '#D1D1D6' }}>
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {React.Children.map(actions, (child) => {
                  if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                      className: cn(child.props.className, "font-black uppercase tracking-widest text-[10px] bg-red-600 hover:bg-red-500 text-white border-none shadow-lg shadow-red-900/20")
                    });
                  }
                  return child;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </div>
    </div>
  );
}
