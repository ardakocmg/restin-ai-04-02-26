import { AlertTriangle,ChevronDown,Home,RefreshCcw } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function ErrorPage({ error, resetError }) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center max-w-md px-4">
        <AlertTriangle className="w-24 h-24 mx-auto mb-6 text-destructive" />
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Something Went Wrong
        </h1>
        <p className="text-lg mb-6 text-muted-foreground">
          An unexpected error occurred.
        </p>

        {/* Error Details - Collapsible */}
        {error && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 mx-auto mb-2 text-sm text-muted-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              />
              Error details
            </button>
            {showDetails && (
              <div
                className="p-4 rounded-lg text-left max-h-40 overflow-y-auto bg-destructive/10 border border-destructive/30"
              >
                <p className="text-sm font-mono break-words text-destructive">
                  {error.message || error.toString()}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh Page
          </Button>
          <Button
            onClick={() => navigate('/manager/dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
