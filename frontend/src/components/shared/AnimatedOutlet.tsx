import { AnimatePresence,motion } from 'framer-motion';
import React,{ useRef } from 'react';
import { useLocation,useOutlet } from 'react-router-dom';

/**
 * Drop-in replacement for <Outlet> that animates page transitions.
 *
 * Uses `mode="popLayout"` instead of `mode="wait"` so the old page
 * is removed instantly and the new page fades in without blocking.
 * This prevents the "system feels slow" perception caused by wait-mode.
 *
 * Transition: subtle fade-in (120ms). No exit animation.
 */
export default function AnimatedOutlet(): React.ReactElement {
    const location = useLocation();
    const outlet = useOutlet();

    // Clone the outlet element so AnimatePresence can work with exit animations
    const outletRef = useRef(outlet);
    if (outlet) {
        outletRef.current = outlet;
    }

    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.12,
                    ease: 'easeOut',
                }}
                className="min-h-full"
            >
                {outletRef.current}
            </motion.div>
        </AnimatePresence>
    );
}
