import { Loader2 } from "lucide-react";
import { useEffect,useState } from "react";

export default function LoadingOverlay({ open, title = "Loading…", body = "Please wait…", onCancel }) {
  const [showDismiss, setShowDismiss] = useState(false);

  useEffect(() => {
    if (!open) { setShowDismiss(false); return; }
    const timer = setTimeout(() => setShowDismiss(true), 15000);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <div className="text-lg font-semibold text-foreground mb-3">{title}</div>
        <div className="text-sm text-secondary-foreground mb-4">{body}</div>

        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          <div className="text-xs text-muted-foreground">Working…</div>
        </div>

        {onCancel && (
          <button
            className="w-full rounded-lg bg-white/10 hover:bg-white/15 py-2.5 text-foreground text-sm font-medium transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        {!onCancel && showDismiss && (
          <button
            className="w-full rounded-lg bg-secondary hover:bg-secondary/80 py-2.5 text-secondary-foreground text-sm font-medium transition-colors border border-border"
            onClick={() => setShowDismiss(false)}
            title="Dismiss this overlay"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
