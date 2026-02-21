
/* ─── Futuristic Kitchen Robot Mascot for Hey Rin ─────────────── */
/* Red body with modern blue LED eyes/face visor                  */
export default function RinMascot({ size = 52, listening = false, className = '' }: {
    size?: number;
    listening?: boolean;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="rin-body" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <linearGradient id="rin-dark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b91c1c" />
                    <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="rin-visor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="rin-eye-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <radialGradient id="rin-eye-halo">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                <filter id="rin-blue-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="rin-shadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#991b1b" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Sound waves when listening */}
            {listening && (
                <g>
                    <circle cx="50" cy="48" r="42" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.25">
                        <animate attributeName="r" values="42;48;42" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.25;0.08;0.25" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="50" cy="48" r="46" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.12">
                        <animate attributeName="r" values="46;53;46" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                </g>
            )}

            {/* ─── Antenna (whisk) ─── */}
            <line x1="50" y1="14" x2="50" y2="22" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round">
                <animate attributeName="y1" values="14;12;14" dur="2.5s" repeatCount="indefinite" />
            </line>
            {/* Signal orb */}
            <circle cx="50" cy="11" r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1">
                <animate attributeName="cy" values="11;9;11" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="50" cy="11" r="1.5" fill="#38bdf8" filter="url(#rin-blue-glow)">
                <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="cy" values="11;9;11" dur="2.5s" repeatCount="indefinite" />
            </circle>

            {/* ─── Head (rounded pot/helmet) ─── */}
            <rect x="26" y="22" width="48" height="32" rx="12" fill="url(#rin-body)" filter="url(#rin-shadow)" />
            {/* Head top rim */}
            <rect x="28" y="22" width="44" height="5" rx="2.5" fill="url(#rin-dark)" />

            {/* ─── Face Visor (dark screen) ─── */}
            <rect x="30" y="29" width="40" height="18" rx="9" fill="url(#rin-visor)" stroke="#0ea5e9" strokeWidth="0.5" strokeOpacity="0.3" />

            {/* ─── Modern Blue LED Eyes ─── */}
            {/* Left eye glow halo */}
            <circle cx="41" cy="38" r="7" fill="url(#rin-eye-halo)">
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Left eye */}
            <circle cx="41" cy="38" r="4" fill="url(#rin-eye-glow)" filter="url(#rin-blue-glow)">
                <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="41" cy="38" r="1.8" fill="white" opacity="0.7" />

            {/* Right eye glow halo */}
            <circle cx="59" cy="38" r="7" fill="url(#rin-eye-halo)">
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Right eye — winks */}
            <ellipse cx="59" cy="38" rx="4" ry="4" fill="url(#rin-eye-glow)" filter="url(#rin-blue-glow)">
                <animate attributeName="ry" values="4;4;4;0.5;4;4" dur="5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
            </ellipse>
            <circle cx="59" cy="38" r="1.8" fill="white" opacity="0.7">
                <animate attributeName="r" values="1.8;1.8;1.8;0;1.8;1.8" dur="5s" repeatCount="indefinite" />
            </circle>

            {/* Mouth — LED strip smile */}
            <path d="M44 44 Q50 47 56 44" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" filter="url(#rin-blue-glow)">
                <animate attributeName="d" values="M44 44 Q50 47 56 44;M44 44 Q50 48 56 44;M44 44 Q50 47 56 44" dur="3s" repeatCount="indefinite" />
            </path>

            {/* ─── Body (mixing bowl / torso) ─── */}
            <path d="M32 56 L28 74 Q28 82 50 82 Q72 82 72 74 L68 56" fill="url(#rin-body)" filter="url(#rin-shadow)" />
            {/* Chest plate line */}
            <path d="M38 58 L38 76 Q38 80 50 80 Q62 80 62 76 L62 58" fill="none" stroke="#fca5a5" strokeWidth="0.8" opacity="0.3" />

            {/* ─── Left arm (spatula) ─── */}
            <g>
                <line x1="28" y1="60" x2="16" y2="68" stroke="#b91c1c" strokeWidth="3.5" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" values="0 28 60;-10 28 60;0 28 60" dur="2.5s" repeatCount="indefinite" />
                </line>
                <rect x="10" y="66" width="8" height="11" rx="3" fill="url(#rin-dark)" transform="rotate(-15 14 71)">
                    <animateTransform attributeName="transform" type="rotate" values="-15 14 71;-25 14 71;-15 14 71" dur="2.5s" repeatCount="indefinite" />
                </rect>
            </g>

            {/* ─── Right arm (ladle) ─── */}
            <g>
                <line x1="72" y1="60" x2="84" y2="68" stroke="#b91c1c" strokeWidth="3.5" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" values="0 72 60;10 72 60;0 72 60" dur="2.8s" repeatCount="indefinite" />
                </line>
                <circle cx="87" cy="70" r="5.5" fill="url(#rin-dark)">
                    <animateTransform attributeName="transform" type="rotate" values="0 72 60;10 72 60;0 72 60" dur="2.8s" repeatCount="indefinite" />
                </circle>
            </g>

            {/* ─── Floating utensil orbit ─── */}
            <g opacity="0.35">
                <animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="10s" repeatCount="indefinite" />
                {/* Knife */}
                <rect x="88" y="47" width="2" height="10" rx="1" fill="#fca5a5" />
                <rect x="87.5" y="43" width="3" height="5" rx="1" fill="#b91c1c" />
            </g>
            <g opacity="0.25">
                <animateTransform attributeName="transform" type="rotate" values="180 50 50;540 50 50" dur="12s" repeatCount="indefinite" />
                {/* Fork */}
                <rect x="6" y="47" width="1.5" height="8" rx="0.75" fill="#fca5a5" />
                <line x1="6" y1="43" x2="6" y2="47" stroke="#b91c1c" strokeWidth="1" />
                <line x1="8" y1="43" x2="8" y2="47" stroke="#b91c1c" strokeWidth="1" />
            </g>

            {/* ─── Power button (belly) ─── */}
            <circle cx="50" cy="70" r="4" fill="#991b1b" stroke="#b91c1c" strokeWidth="1" />
            <path d="M50 67 L50 69 M48 68.5 A3 3 0 1 0 52 68.5" stroke="#38bdf8" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#rin-blue-glow)">
                <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </path>

            {/* ─── Feet (small pans) ─── */}
            <ellipse cx="40" cy="84" rx="7" ry="3" fill="#991b1b" />
            <ellipse cx="60" cy="84" rx="7" ry="3" fill="#991b1b" />
            <rect x="32" y="82.5" width="4" height="2" rx="1" fill="#b91c1c" />
            <rect x="64" y="82.5" width="4" height="2" rx="1" fill="#b91c1c" />
        </svg>
    );
}
