/**
 * LoadingSpinner — Branded Restin.AI loading spinner
 *
 * Uses /logo192.png as the spinner icon. When the logo file
 * is updated, all loading spinners automatically reflect the change.
 *
 * Variants:
 *  - inline:     Within cards/sections (default)
 *  - page:       Centered in the content area (min-h 16rem)
 *  - fullScreen: Fixed overlay covering the entire viewport
 *
 * Usage:
 *   <LoadingSpinner />
 *   <LoadingSpinner size="lg" variant="page" text="Fetching data…" />
 *   <LoadingSpinner variant="fullScreen" />
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import './BrandedLoading.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  variant?: 'inline' | 'page' | 'fullScreen';
  text?: string;
  className?: string;
  /** @deprecated Use variant="fullScreen" instead */
  fullScreen?: boolean;
}

/**
 * Centralized logo path — single source of truth.
 * Update the file at /public/logo192.png to change all spinners.
 */
const LOGO_PATH = '/logo192.png';

export default function LoadingSpinner({
  size = 'default',
  variant,
  text,
  fullScreen = false,
  className
}: LoadingSpinnerProps) {
  // Support legacy fullScreen prop
  const resolvedVariant = variant ?? (fullScreen ? 'fullScreen' : 'inline');

  const wrapperClass = {
    inline: 'branded-spinner-inline',
    page: 'branded-spinner-page',
    fullScreen: 'branded-spinner-fullscreen',
  }[resolvedVariant];

  return (
    <div className={cn(wrapperClass, className)}>
      <div className={cn('branded-spinner-container', `branded-spinner-${size}`)}>
        <div className="branded-spinner-ring">
          <motion.img
            src={LOGO_PATH}
            alt="Loading"
            className="branded-spinner-logo"
            draggable={false}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
        {text && (
          <motion.p
            className="branded-spinner-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    </div>
  );
}
