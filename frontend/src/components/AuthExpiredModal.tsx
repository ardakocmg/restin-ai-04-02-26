import { useNavigate } from 'react-router-dom';

export default function AuthExpiredModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">Session expired</h2>
          <p className="text-sm text-secondary-foreground">
            Please re-authenticate to continue.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              onClose();
              // Stay on current page
            }}
            className="flex-1 rounded-lg bg-secondary hover:bg-secondary/80 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            Stay here
          </button>
          <button
            onClick={() => {
              navigate('/login');
              onClose();
            }}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            Go to PIN
          </button>
        </div>
      </div>
    </div>
  );
}
