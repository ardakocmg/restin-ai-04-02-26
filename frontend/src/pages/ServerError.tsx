import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Premium 500 Server Error page.
 * Uses semantic design tokens for theme compatibility.
 */
const ServerError: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary, #09090b)',
                color: 'var(--text-primary, #fafafa)',
                fontFamily: "'Inter', -apple-system, sans-serif",
                padding: '2rem',
                textAlign: 'center',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            >
                {/* Error Icon */}
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>

                <div
                    style={{
                        fontSize: 'clamp(3rem, 8vw, 5rem)',
                        fontWeight: 800,
                        lineHeight: 1,
                        background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem',
                        letterSpacing: '-0.03em',
                    }}
                >
                    Server Error
                </div>

                <p
                    style={{
                        fontSize: '1rem',
                        color: 'var(--text-secondary, #a1a1aa)',
                        maxWidth: '440px',
                        marginBottom: '2rem',
                        lineHeight: 1.6,
                    }}
                >
                    Something went wrong on our end. Our team has been notified. Please try again in a moment.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--border-primary, #27272a)',
                            background: 'transparent',
                            color: 'var(--text-primary, #fafafa)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        ↻ Retry
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/admin/dashboard')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                            color: '#ffffff',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                        }}
                    >
                        Go to Dashboard
                    </motion.button>
                </div>
            </motion.div>

            <p
                style={{
                    position: 'absolute',
                    bottom: '2rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary, #52525b)',
                }}
            >
                Restin.ai — Enterprise Restaurant OS
            </p>
        </div>
    );
};

export default ServerError;
