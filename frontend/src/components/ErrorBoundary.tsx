import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { logger } from '../lib/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught:', { error: error.message, componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-foreground text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-secondary-foreground mb-6">
              Please refresh the page. If this persists, contact your manager.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-foreground font-bold py-6 px-4 text-lg"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.history.back();
                }}
                variant="outline"
                className="w-full border-border text-secondary-foreground hover:bg-secondary hover:text-foreground py-4"
              >
                ← Go Back
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  variant="outline"
                  className="flex-1 border-border text-secondary-foreground hover:bg-secondary hover:text-foreground py-3 text-sm"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => { window.location.href = '/manager/dashboard'; }}
                  variant="outline"
                  className="flex-1 border-border text-secondary-foreground hover:bg-secondary hover:text-foreground py-3 text-sm"
                >
                  Dashboard
                </Button>
              </div>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="text-muted-foreground text-sm cursor-pointer">Error details</summary>
                <pre className="text-red-400 text-xs mt-2 overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
