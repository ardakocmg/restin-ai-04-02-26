import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Lock,
  Database,
  Wifi,
  Ban
} from 'lucide-react';

const ICON_MAP = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  permission: Lock,
  network: Wifi,
  database: Database,
  blocked: Ban,
  alert: AlertCircle
};

const STATE_COLORS = {
  error: {
    icon: '#E53935',
    glow: 'rgba(229, 57, 53, 0.2)',
    border: 'rgba(229, 57, 53, 0.3)'
  },
  warning: {
    icon: '#FB8C00',
    glow: 'rgba(251, 140, 0, 0.2)',
    border: 'rgba(251, 140, 0, 0.3)'
  },
  info: {
    icon: '#1E88E5',
    glow: 'rgba(30, 136, 229, 0.2)',
    border: 'rgba(30, 136, 229, 0.3)'
  },
  success: {
    icon: '#43A047',
    glow: 'rgba(67, 160, 71, 0.2)',
    border: 'rgba(67, 160, 71, 0.3)'
  },
  permission: {
    icon: '#E53935',
    glow: 'rgba(229, 57, 53, 0.2)',
    border: 'rgba(229, 57, 53, 0.3)'
  },
  network: {
    icon: '#E53935',
    glow: 'rgba(229, 57, 53, 0.2)',
    border: 'rgba(229, 57, 53, 0.3)'
  },
  database: {
    icon: '#E53935',
    glow: 'rgba(229, 57, 53, 0.2)',
    border: 'rgba(229, 57, 53, 0.3)'
  },
  blocked: {
    icon: '#E53935',
    glow: 'rgba(229, 57, 53, 0.2)',
    border: 'rgba(229, 57, 53, 0.3)'
  },
  alert: {
    icon: '#E53935',
    glow: 'rgba(229, 57, 53, 0.2)',
    border: 'rgba(229, 57, 53, 0.3)'
  }
};

/**
 * StateModal - Emergent Premium State Screen Component
 * 
 * Usage:
 * <StateModal
 *   type="error"
 *   title="Access Denied"
 *   message="You don't have permission to access this resource"
 *   actions={[
 *     { label: 'Go Back', onClick: () => navigate(-1) },
 *     { label: 'Contact Admin', onClick: () => {}, variant: 'secondary' }
 *   ]}
 *   onClose={() => setShowModal(false)}
 * />
 */
export default function StateModal({
  type = 'info',
  title,
  message,
  details,
  actions = [],
  onClose,
  showBackground = true,
  icon: CustomIcon
}) {
  const Icon = CustomIcon || ICON_MAP[type] || Info;
  const colors = STATE_COLORS[type] || STATE_COLORS.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Blurred Background */}
      {showBackground && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />
      )}

      {/* Modal Card - PIN Screen Style */}
      <div
        className="relative z-10 w-full max-w-md card-dark p-8 rounded-2xl animate-slide-up"
        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px ${colors.border}`
        }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
            backgroundColor: colors.glow,
            boxShadow: `0 0 24px ${colors.glow}`
          }}
        >
          <Icon
            className="w-10 h-10"
            style={{ color: colors.icon  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /* keep-inline */ /* keep-inline */
          />
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-heading text-center mb-3"
          style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /* keep-inline */ /* keep-inline */
        >
          {title}
        </h2>

        {/* Message */}
        <p
          className="text-center mb-6 leading-relaxed"
          style={{ color: '#D4D4D8', fontSize: '15px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /* keep-inline */ /* keep-inline */
        >
          {message}
        </p>

        {/* Details (optional) */}
        {details && (
          <div
            className="mb-6 p-4 rounded-xl font-mono text-sm"
            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#A1A1AA'
            }}
          >
            {details}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`w-full h-12 rounded-xl font-bold uppercase tracking-wide transition-all duration-150 ${action.variant === 'secondary'
                  ? 'bg-card border border-border text-foreground hover:bg-secondary hover:border-red-500/50'
                  : 'btn-primary'
                }`}
              style={
                action.variant !== 'secondary' && !action.disabled
                  ? {
                    background: `linear-gradient(135deg, ${colors.icon} 0%, ${colors.icon}dd 100%)`,
                    boxShadow: `0 4px 12px ${colors.glow}`
                  }
                  : action.disabled
                    ? {
                      opacity: 0.5,
                      cursor: 'not-allowed'
                    }
                    : {}
              }
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Close button (optional) */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Action" className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            style={{ color: '#9CA3AF'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /* keep-inline */ /* keep-inline */
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Quick helper hooks for common state modals
 */
export const useStateModal = () => {
  const [modal, setModal] = React.useState(null);

  const showError = (title, message, actions) => {
    setModal({ type: 'error', title, message, actions });
  };

  const showWarning = (title, message, actions) => {
    setModal({ type: 'warning', title, message, actions });
  };

  const showInfo = (title, message, actions) => {
    setModal({ type: 'info', title, message, actions });
  };

  const showSuccess = (title, message, actions) => {
    setModal({ type: 'success', title, message, actions });
  };

  const showPermissionDenied = (resource, actions) => {
    setModal({
      type: 'permission',
      title: 'Access Denied',
      message: `You don't have permission to access ${resource || 'this resource'}`,
      actions
    });
  };

  const close = () => setModal(null);

  return {
    modal,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    showPermissionDenied,
    close,
    StateModal: modal ? (
      <StateModal {...modal} onClose={close} />
    ) : null
  };
};
