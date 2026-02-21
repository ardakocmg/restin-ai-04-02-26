import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Printer, RotateCcw, ZoomIn, ZoomOut, Maximize2,
    Thermometer, Eye, Download
} from 'lucide-react';

interface ThermalPreviewProps {
    html: string;
    paperWidth?: number;
    onClose?: () => void;
}

/**
 * ThermalPreview — standalone thermal receipt preview component.
 * Renders HTML output with monospace font, optional grayscale filter,
 * and zoom controls to simulate ESC/POS thermal printer output.
 */
export default function ThermalPreview({ html, paperWidth = 576, onClose }: ThermalPreviewProps) {
    const { t } = useTranslation();
    const [zoom, setZoom] = useState(1);
    const [thermalMode, setThermalMode] = useState(true);
    const [showRuler, setShowRuler] = useState(false);

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.4));
    const resetZoom = () => setZoom(1);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-violet-400" />
                    <h3 className="text-sm font-semibold text-foreground">{t('Thermal Preview')}</h3>
                    <span className="text-xs text-muted-foreground ml-2">
                        {paperWidth === 576 ? '80mm' : '58mm'} • {Math.round(zoom * 100)}%
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setThermalMode(!thermalMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${thermalMode
                                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                : 'bg-muted text-muted-foreground border border-transparent'
                            }`}
                    >
                        <Printer className="w-3.5 h-3.5" />
                        {t('Thermal')}
                    </button>
                    <button
                        onClick={() => setShowRuler(!showRuler)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showRuler
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-muted text-muted-foreground border border-transparent'
                            }`}
                    >
                        {t('Ruler')}
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={resetZoom} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    {onClose && (
                        <>
                            <div className="w-px h-5 bg-border mx-1" />
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs font-medium">
                                ✕
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Paper Simulation */}
            <div className="flex-1 overflow-auto bg-secondary p-6 flex justify-center">
                <div className="relative">
                    {/* Ruler */}
                    {showRuler && (
                        <div className="absolute -top-6 left-0 flex" style={{ width: `${paperWidth * zoom}px` }}>
                            {Array.from({ length: Math.ceil(paperWidth / 10) }, (_, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 border-l border-emerald-500/40 text-emerald-500/60"
                                    style={{ width: `${10 * zoom}px`, height: '16px' }}
                                >
                                    {i % 5 === 0 && (
                                        <span className="text-[8px] ml-0.5">{i * 10}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Receipt paper */}
                    <div
                        className="bg-white shadow-2xl shadow-black/30 relative"
                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                            width: `${paperWidth * zoom}px`,
                            minHeight: '400px',
                            transform: `scale(1)`,
                            transformOrigin: 'top center',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Top tear edge */}
                        <div
                            className="h-3 w-full opacity-30"
                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 8px)'
                            }}
                        />

                        {/* Content */}
                        <div
                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                fontFamily: "'Courier New', 'Courier', monospace",
                                fontSize: `${12 * zoom}px`,
                                lineHeight: '1.4',
                                color: '#000',
                                padding: `${8 * zoom}px`,
                                ...(thermalMode ? {
                                    filter: 'grayscale(100%) contrast(180%)',
                                    imageRendering: 'pixelated' as const
                                } : {})
                            }}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />

                        {/* Bottom tear edge */}
                        <div
                            className="h-3 w-full opacity-30"
                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 8px)'
                            }}
                        />
                    </div>

                    {/* Paper shadow */}
                    <div
                        className="absolute -bottom-2 left-2 right-2 h-4 rounded-b-xl opacity-20"
                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)'
                        }}
                    />
                </div>
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
                <span>{t('Paper')}: {paperWidth}px ({paperWidth === 576 ? '80mm' : '58mm'} @ 203 DPI)</span>
                <span>{t('Simulated thermal output • Actual print may vary')}</span>
            </div>
        </div>
    );
}
