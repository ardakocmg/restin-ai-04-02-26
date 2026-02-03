import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { AlertTriangle, Home, RefreshCcw, ChevronDown } from 'lucide-react';

export default function ErrorPage({ error, resetError }) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div 
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: '#0A0A0B' }}
    >
      <div className="text-center max-w-md px-4">
        <AlertTriangle 
          className="w-24 h-24 mx-auto mb-6"
          style={{ color: '#E53935' }}
        />
        <h1 
          className="text-3xl font-bold mb-4"
          style={{ color: '#F5F5F7' }}
        >
          Something Went Wrong
        </h1>
        <p 
          className="text-lg mb-6"
          style={{ color: '#A1A1AA' }}
        >
          An unexpected error occurred.
        </p>
        
        {/* Error Details - Collapsible */}
        {error && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 mx-auto mb-2 text-sm"
              style={{ color: '#71717A' }}
            >
              <ChevronDown 
                className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              />
              Error details
            </button>
            {showDetails && (
              <div 
                className="p-4 rounded-lg text-left max-h-40 overflow-y-auto"
                style={{ 
                  backgroundColor: 'rgba(229, 57, 53, 0.1)',
                  border: '1px solid rgba(229, 57, 53, 0.3)'
                }}
              >
                <p className="text-sm font-mono break-words" style={{ color: '#FCA5A5' }}>
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
            onClick={() => navigate('/admin/dashboard')}
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
