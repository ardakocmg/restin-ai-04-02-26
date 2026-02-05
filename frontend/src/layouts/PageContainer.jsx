import React from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function PageContainer({ children, className, title, description, actions }) {
  const navigate = useNavigate();

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
            <div className="flex-1 min-w-0 flex items-start gap-4">
              {/* Global Back Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="mt-1 h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <div>
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
