import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Check } from 'lucide-react';

export default function SavedViewIndicator({ isRestored, onReset }) {
  if (!isRestored) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
        <Check className="h-3 w-3" />
        View restored from last session
      </Badge>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to default
        </button>
      )}
    </div>
  );
}
