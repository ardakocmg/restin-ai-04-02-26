import React from "react";
import { useUISettings } from "../context/UISettingsContext";
import { useAuth } from "../context/AuthContext";

export default function ErrorScreen({ error, onRetry }) {
  const { debugMode, errorCopy } = useUISettings();
  const { user } = useAuth();

  const role = user?.role || "staff";
  const isAdmin = ["owner", "general_manager", "manager", "it_admin", "finance", "supervisor"].includes(role);

  const title = errorCopy.genericTitle;
  let body = errorCopy.staffBody;
  
  if (role === "kitchen" || role === "head_chef" || role === "expo") {
    body = errorCopy.kitchenBody;
  }
  if (isAdmin) {
    body = errorCopy.genericBody;
  }

  const showDetails = debugMode && isAdmin;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-white">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-red-500 text-3xl">⚠️</div>
          <div>
            <div className="text-xl font-semibold">{title}</div>
            <div className="text-sm text-zinc-400 mt-1">{body}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 font-semibold transition-colors"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
          {onRetry && (
            <button
              className="flex-1 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              onClick={onRetry}
            >
              Try Again
            </button>
          )}
        </div>

        {showDetails && (
          <details className="mt-4 text-xs text-zinc-400">
            <summary className="cursor-pointer hover:text-white">Error details (Admin Only)</summary>
            <pre className="mt-2 whitespace-pre-wrap bg-zinc-800 p-3 rounded">
              {String(error?.stack || error?.message || error)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
