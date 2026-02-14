import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Premium 404 Not Found page with dark mode support.
 * Uses semantic design tokens for theme compatibility.
 */
const NotFound: React.FC = () => {
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
                {/* Glowing 404 */}
                <div
                    style={{
                        fontSize: 'clamp(6rem, 15vw, 12rem)',
                        fontWeight: 800,
                        lineHeight: 1,
                        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem',
                        letterSpacing: '-0.05em',
                    }}
                >
                    404
                </div>

                <h2
                    style={{
                        fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                        color: 'var(--text-primary, #fafafa)',
                    }}
                >
                    Page Not Found
                </h2>

                <p
                    style={{
                        fontSize: '1rem',
                        color: 'var(--text-secondary, #a1a1aa)',
                        maxWidth: '400px',
                        marginBottom: '2rem',
                        lineHeight: 1.6,
                    }}
                >
                    The page you're looking for doesn't exist or has been moved. Let's get you back on track.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(-1)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--border-primary, #27272a)',
                            background: 'transparent',
                            color: 'var(--text-primary, #fafafa)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        ← Go Back
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/manager/dashboard')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: '#ffffff',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.2s',
                        }}
                    >
                        Go to Dashboard
                    </motion.button>
                </div>
            </motion.div>

            {/* Subtle branding */}
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

export default NotFound;
