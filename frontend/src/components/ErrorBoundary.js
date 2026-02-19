import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-zinc-100 text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-zinc-300 mb-6">
              Please refresh the page. If this persists, contact your manager.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-4 text-lg"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.history.back();
                }}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white py-4"
              >
                ← Go Back
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={() => this.setState({ hasError: false })}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white py-3 text-sm"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => { window.location.href = '/manager/dashboard'; }}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white py-3 text-sm"
                >
                  Dashboard
                </Button>
              </div>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="text-zinc-500 text-sm cursor-pointer">Error details</summary>
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
