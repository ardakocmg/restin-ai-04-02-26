import React, { useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Drop-in replacement for <Outlet> that animates page transitions.
 *
 * Transition types:
 * - Route change: fade + subtle slide-up (150ms)
 * - Same route (query change): instant (no animation)
 *
 * Usage: Replace <Outlet /> with <AnimatedOutlet /> in AdminLayout.
 */
export default function AnimatedOutlet() {
    const location = useLocation();
    const outlet = useOutlet();

    // Clone the outlet element so AnimatePresence can work with exit animations
    // useOutlet returns null when no match, we need to cache the last outlet
    const outletRef = useRef(outlet);
    if (outlet) {
        outletRef.current = outlet;
    }

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                    duration: 0.18,
                    ease: [0.25, 0.46, 0.45, 0.94], // ease-out quad
                }}
                className="min-h-full"
            >
                {outletRef.current}
            </motion.div>
        </AnimatePresence>
    );
}
