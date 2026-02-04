import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthExpiredModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-2">Session expired</h2>
          <p className="text-sm text-zinc-300">
            Please re-authenticate to continue.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              onClose();
              // Stay on current page
            }}
            className="flex-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Stay here
          </button>
          <button
            onClick={() => {
              navigate('/login');
              onClose();
            }}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Go to PIN
          </button>
        </div>
      </div>
    </div>
  );
}
