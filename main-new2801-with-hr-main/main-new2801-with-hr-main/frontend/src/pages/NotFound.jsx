import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: '#0A0A0B' }}
    >
      <div className="text-center max-w-md px-4">
        <h1 
          className="text-9xl font-bold mb-4"
          style={{ color: '#E53935' }}
        >
          404
        </h1>
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: '#F5F5F7' }}
        >
          Page Not Found
        </h2>
        <p 
          className="text-lg mb-8"
          style={{ color: '#A1A1AA' }}
        >
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
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
