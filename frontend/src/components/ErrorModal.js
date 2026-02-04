import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorModal({ open, title, body, onClose, onRetry }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div className="text-lg font-semibold text-white">{title || "Error"}</div>
        </div>
        <div className="text-sm text-zinc-300 mb-6">{body || "Please try again."}</div>

        <div className="flex gap-3">
          {onRetry && (
            <button
              className="flex-1 rounded-lg bg-white/10 hover:bg-white/15 py-2.5 text-sm text-white font-medium transition-colors"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
          <button
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 py-2.5 text-sm text-white font-medium transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
