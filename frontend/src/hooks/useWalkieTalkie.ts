/**
 * Push-to-Talk Walkie Talkie Hook — WebRTC Audio + Transcription
 * Rule #40 & #51: Native PTT Voice Mesh
 *
 * Features:
 * - 3 input modes: Touch hold, Space bar, AirPods MediaSession toggle
 * - Free speech-to-text via Web Speech API (zero cost, runs in browser)
 * - Live speaker tracking for channel-wide visibility
 * - Call log with transcript history
 * - onTransmissionEnd callback to inject voice messages into chat
 */
import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────
export interface CallLogEntry {
    id: string;
    speaker: string;
    channelId: string;
    startedAt: string;
    duration: number; // seconds
    transcript: string;
}

export interface LiveSpeaker {
    name: string;
    initials: string;
    color: string;
    channelId: string;
    startedAt: number;
}

export interface TransmissionResult {
    channelId: string;
    speaker: string;
    duration: number;
    transcript: string;
    timestamp: string;
}

interface WalkieTalkieOptions {
    onTransmissionEnd?: (result: TransmissionResult) => void;
}

interface WalkieTalkieState {
    isTalking: boolean;
    isConnected: boolean;
    activePeers: number;
    startTalking: () => void;
    stopTalking: () => void;
    toggleTalking: () => void;
    micPermission: 'granted' | 'denied' | 'prompt';
    inputMode: 'hold' | 'toggle' | 'keyboard';
    liveTranscript: string;
    callLog: CallLogEntry[];
    clearCallLog: () => void;
    liveSpeakers: LiveSpeaker[];
}

// ─── SpeechRecognition polyfill ─────────────────────────────────────────
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: unknown) => void) | null;
    start: () => void;
    stop: () => void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
    const w = window as unknown as Record<string, unknown>;
    return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor | null;
};

export const useWalkieTalkie = (
    channelId: string,
    options?: WalkieTalkieOptions
): WalkieTalkieState => {
    const [isTalking, setIsTalking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [peers] = useState<string[]>([]);
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [inputMode, setInputMode] = useState<'hold' | 'toggle' | 'keyboard'>('hold');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
    const [liveSpeakers, setLiveSpeakers] = useState<LiveSpeaker[]>([]);

    const localStream = useRef<MediaStream | null>(null);
    const isTalkingRef = useRef(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const talkStartRef = useRef<number>(0);
    const transcriptBufferRef = useRef('');
    const onTransmissionEndRef = useRef(options?.onTransmissionEnd);

    // Keep callback ref up to date
    useEffect(() => {
        onTransmissionEndRef.current = options?.onTransmissionEnd;
    }, [options?.onTransmissionEnd]);

    // ─── Get Microphone Access on mount ─────────────────────────────────
    useEffect(() => {
        let mounted = true;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                localStream.current = stream;
                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
                setIsConnected(true);
                setMicPermission('granted');
            })
            .catch(() => {
                if (mounted) {
                    setMicPermission('denied');
                }
            });

        return () => {
            mounted = false;
            if (localStream.current) {
                localStream.current.getTracks().forEach(t => t.stop());
                localStream.current = null;
            }
        };
    }, [channelId]);

    // ─── Speech Recognition ─────────────────────────────────────────────
    const startRecognition = useCallback(() => {
        const SR = getSpeechRecognition();
        if (!SR) return;
        try {
            const recognition = new SR();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += transcript + ' ';
                    } else {
                        interim += transcript;
                    }
                }
                if (final) {
                    transcriptBufferRef.current += final;
                }
                setLiveTranscript(transcriptBufferRef.current + interim);
            };

            recognition.onerror = () => {
                // Speech recognition is best-effort
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch {
            // SpeechRecognition not available
        }
    }, []);

    const stopRecognition = useCallback(() => {
        try {
            recognitionRef.current?.stop();
        } catch {
            // Already stopped
        }
        recognitionRef.current = null;
    }, []);

    // ─── Core PTT Controls ──────────────────────────────────────────────
    const startTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = true;
        });
        setIsTalking(true);
        isTalkingRef.current = true;
        talkStartRef.current = Date.now();
        transcriptBufferRef.current = '';
        setLiveTranscript('');
        startRecognition();

        // Show self as live speaker
        setLiveSpeakers(prev => [
            ...prev.filter(s => s.name !== 'You'),
            { name: 'You', initials: 'ME', color: 'bg-zinc-600', channelId, startedAt: Date.now() }
        ]);
    }, [channelId, startRecognition]);

    const stopTalking = useCallback(() => {
        if (!localStream.current || !isTalkingRef.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = false;
        });
        setIsTalking(false);
        isTalkingRef.current = false;
        stopRecognition();

        const duration = Math.round((Date.now() - talkStartRef.current) / 1000);
        const transcript = transcriptBufferRef.current.trim();
        const timestamp = new Date(talkStartRef.current).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Add to call log (only if > 1 second)
        if (duration >= 1) {
            const entry: CallLogEntry = {
                id: `call-${Date.now()}`,
                speaker: 'You',
                channelId,
                startedAt: timestamp,
                duration,
                transcript: transcript || '(no transcript)',
            };
            setCallLog(prev => [entry, ...prev].slice(0, 50));

            // Fire callback → lets the dashboard inject a voice message into the channel
            onTransmissionEndRef.current?.({
                channelId,
                speaker: 'You',
                duration,
                transcript: transcript || '',
                timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            });
        }

        // Remove self from live speakers
        setLiveSpeakers(prev => prev.filter(s => s.name !== 'You'));
        setLiveTranscript('');
    }, [channelId, stopRecognition]);

    const toggleTalking = useCallback(() => {
        if (isTalkingRef.current) {
            stopTalking();
        } else {
            startTalking();
        }
        setInputMode('toggle');
    }, [startTalking, stopTalking]);

    const clearCallLog = useCallback(() => {
        setCallLog([]);
    }, []);

    // ─── AirPods / Bluetooth: MediaSession API ─────────────────────────
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `PTT — #${channelId}`,
                artist: 'Restin.AI Walkie-Talkie',
                album: 'Hive Communications',
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (!isTalkingRef.current) {
                    startTalking();
                    setInputMode('toggle');
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (isTalkingRef.current) {
                    stopTalking();
                    setInputMode('toggle');
                }
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                toggleTalking();
            });
        } catch {
            // MediaSession not fully supported
        }

        return () => {
            try {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
            } catch {
                // Cleanup
            }
        };
    }, [channelId, startTalking, stopTalking, toggleTalking]);

    // ─── Keyboard: Space bar hold ───────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                startTalking();
                setInputMode('keyboard');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.code === 'Space') {
                e.preventDefault();
                stopTalking();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [startTalking, stopTalking]);

    // ─── Simulate remote speakers (WebSocket in production) ─────────────
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() < 0.05) {
                const mockSpeaker: LiveSpeaker = {
                    name: 'Chef Marco',
                    initials: 'CM',
                    color: 'bg-orange-600',
                    channelId,
                    startedAt: Date.now(),
                };
                setLiveSpeakers(prev => [...prev.filter(s => s.name !== mockSpeaker.name), mockSpeaker]);
                setTimeout(() => {
                    setLiveSpeakers(prev => prev.filter(s => s.name !== mockSpeaker.name));
                }, 3000 + Math.random() * 2000);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [channelId]);

    return {
        isTalking,
        isConnected,
        activePeers: peers.length,
        startTalking,
        stopTalking,
        toggleTalking,
        micPermission,
        inputMode,
        liveTranscript,
        callLog,
        clearCallLog,
        liveSpeakers,
    };
};
