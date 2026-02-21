import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface TransmissionResult {
    channelId: string;
    speaker: string;
    duration: number;
    transcript: string;
    timestamp: string;
    audioUrl?: string;
}

export interface CallLogEntry {
    id: string;
    speaker: string;
    channelId: string;
    startedAt: string;
    duration: number;
    transcript: string;
    audioUrl?: string;
}

export interface LiveSpeaker {
    name: string;
    initials: string;
    color: string;
    channelId: string;
    startedAt: number;
}

// ─── SpeechRecognition Types ────────────────────────────────────────────────
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
    const w = window as/**/any as /**/any;
    return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor | null;
};

// ─── Context Shape ──────────────────────────────────────────────────────────
interface PTTContextValue {
    // Channel
    activeChannel: string;
    setActiveChannel: (ch: string) => void;
    // PTT State
    isTalking: boolean;
    isConnected: boolean;
    micPermission: 'granted' | 'denied' | 'prompt';
    inputMode: 'hold' | 'toggle' | 'keyboard';
    // Controls
    startTalking: () => void;
    stopTalking: () => void;
    toggleTalking: () => void;
    // Transcription & Logs
    liveTranscript: string;
    callLog: CallLogEntry[];
    clearCallLog: () => void;
    liveSpeakers: LiveSpeaker[];
    // Transmission callback
    onTransmissionEnd: ((result: TransmissionResult) => void) | null;
    setOnTransmissionEnd: (cb: ((result: TransmissionResult) => void) | null) => void;
}

const PTTContext = createContext<PTTContextValue | null>(null);

// ─── Hook to consume context ────────────────────────────────────────────────
export function useGlobalPTT(): PTTContextValue {
    const ctx = useContext(PTTContext);
    if (!ctx) throw new Error('useGlobalPTT must be used within <GlobalPTTProvider>');
    return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function GlobalPTTProvider({ children }: { children: React.ReactNode }) {
    // Channel state
    const [activeChannel, setActiveChannel] = useState('general');

    // PTT core state
    const [isTalking, setIsTalking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [inputMode, setInputMode] = useState<'hold' | 'toggle' | 'keyboard'>('hold');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
    const [liveSpeakers, setLiveSpeakers] = useState<LiveSpeaker[]>([]);

    // Refs
    const localStream = useRef<MediaStream | null>(null);
    const isTalkingRef = useRef(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const talkStartRef = useRef<number>(0);
    const transcriptBufferRef = useRef('');
    const channelRef = useRef(activeChannel);
    const onTransmissionEndRef = useRef<((result: TransmissionResult) => void) | null>(null);

    // Audio recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Silent audio element for MediaSession activation on PC
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Keep channel ref synced
    useEffect(() => {
        channelRef.current = activeChannel;
    }, [activeChannel]);

    // ─── Silent Audio for MediaSession (AirPods on PC) ──────────────────
    // PERF: Deferred — only activates when PTT is first used, not on page load
    const activateSilentAudio = useCallback(() => {
        if (silentAudioRef.current) return; // Already activated
        try {
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
            audio.loop = true;
            audio.volume = 0.01;
            silentAudioRef.current = audio;
            audio.play().catch(() => { /* Autoplay blocked */ });
        } catch {
            // Audio not available
        }
    }, []);

    // Cleanup silent audio on unmount
    useEffect(() => {
        return () => {
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
                silentAudioRef.current.src = '';
            }
        };
    }, []);

    // ─── Mic Access ─────────────────────────────────────────────────────
    // PERF: Deferred — mic is requested on first PTT use, not on page load
    const ensureMicAccess = useCallback(async () => {
        if (localStream.current) return; // Already acquired
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getAudioTracks().forEach(t => { t.enabled = false; });
            localStream.current = stream;
            setMicPermission('granted');
            setIsConnected(true);
        } catch {
            setMicPermission('denied');
        }
    }, []);

    // Cleanup mic on unmount
    useEffect(() => {
        return () => {
            localStream.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // ─── Speech Recognition ─────────────────────────────────────────────
    const startRecognition = useCallback(() => {
        try {
            const SR = getSpeechRecognition();
            if (!SR) return;
            const recognition = new SR();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        transcriptBufferRef.current += t + ' ';
                    } else {
                        interim += t;
                    }
                }
                setLiveTranscript(transcriptBufferRef.current + interim);
            };
            recognition.onerror = () => { /* silence */ };
            recognition.onend = () => {
                // Restart if still talking
                if (isTalkingRef.current && recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch { /* */ }
                }
            };
            recognitionRef.current = recognition;
            recognition.start();
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

    // Audio recording stream ref (separate from localStream for reliability)
    const recordingStream = useRef<MediaStream | null>(null);

    const startTalking = useCallback(() => {
        // PERF: Defer mic & audio activation to first PTT use
        ensureMicAccess();
        activateSilentAudio();

        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
        setIsTalking(true);
        isTalkingRef.current = true;
        talkStartRef.current = Date.now();
        transcriptBufferRef.current = '';
        setLiveTranscript('');
        startRecognition();

        // ─── Start audio recording with a FRESH stream ──────────────
        audioChunksRef.current = [];
        navigator.mediaDevices?.getUserMedia({ audio: true })
            .then(freshStream => {
                recordingStream.current = freshStream;
                try {
                    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                        ? 'audio/webm;codecs=opus'
                        : MediaRecorder.isTypeSupported('audio/webm')
                            ? 'audio/webm'
                            : '';
                    const recorder = new MediaRecorder(freshStream, mimeType ? { mimeType } : undefined);
                    recorder.ondataavailable = (e: BlobEvent) => {
                        if (e.data.size > 0) audioChunksRef.current.push(e.data);
                    };
                    recorder.start(200); // collect chunks every 200ms
                    mediaRecorderRef.current = recorder;
                } catch {
                    // MediaRecorder not available — recording disabled
                }
            })
            .catch(() => {
                // Mic not accessible for recording
            });

        setLiveSpeakers(prev => [
            ...prev.filter(s => s.name !== 'You'),
            { name: 'You', initials: 'ME', color: 'bg-zinc-600', channelId: channelRef.current, startedAt: Date.now() }
        ]);
    }, [startRecognition, ensureMicAccess, activateSilentAudio]);

    const stopTalking = useCallback(() => {
        if (!isTalkingRef.current) return;

        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
        }
        setIsTalking(false);
        isTalkingRef.current = false;
        stopRecognition();

        const duration = Math.max(1, Math.round((Date.now() - talkStartRef.current) / 1000));
        const transcript = transcriptBufferRef.current.trim();
        const timestamp = new Date(talkStartRef.current).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const currentChannel = channelRef.current;

        // ─── Stop recording & create audio Blob URL ─────────────────
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;

        const cleanupRecordingStream = () => {
            if (recordingStream.current) {
                recordingStream.current.getTracks().forEach(t => t.stop());
                recordingStream.current = null;
            }
        };

        const finalize = (audioUrl?: string) => {
            cleanupRecordingStream();
            const entry: CallLogEntry = {
                id: `call-${Date.now()}`,
                speaker: 'You',
                channelId: currentChannel,
                startedAt: timestamp,
                duration,
                transcript: transcript || '(no transcript)',
                audioUrl,
            };
            setCallLog(prev => [entry, ...prev].slice(0, 50));

            onTransmissionEndRef.current?.({
                channelId: currentChannel,
                speaker: 'You',
                duration,
                transcript: transcript || '',
                timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                audioUrl,
            });
        };

        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = () => {
                const chunks = audioChunksRef.current;
                if (chunks.length > 0) {
                    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    finalize(url);
                } else {
                    finalize();
                }
                audioChunksRef.current = [];
            };
            recorder.stop();
        } else {
            cleanupRecordingStream();
            finalize();
        }

        setLiveSpeakers(prev => prev.filter(s => s.name !== 'You'));
        setLiveTranscript('');
    }, [stopRecognition]);

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

    const setOnTransmissionEnd = useCallback((cb: ((result: TransmissionResult) => void) | null) => {
        onTransmissionEndRef.current = cb;
    }, []);

    // ─── AirPods / Bluetooth: MediaSession API ──────────────────────────
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `PTT — #${activeChannel}`,
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
    }, [activeChannel, startTalking, stopTalking, toggleTalking]);

    // ─── Keyboard: Space bar hold-to-talk (GLOBAL) ──────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            const isEditable = (e.target as HTMLElement)?.isContentEditable;
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || isEditable) return;
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                startTalking();
                setInputMode('keyboard');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            const isEditable = (e.target as HTMLElement)?.isContentEditable;
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || isEditable) return;
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

    // ─── PERF: Mock speaker simulation REMOVED ──────────────────────────
    // Previously ran setInterval every 5s to simulate "Chef Marco" speaking.
    // This caused unnecessary state updates & re-renders across the entire app.
    // Will be replaced with real WebSocket presence when backend supports it.

    const value = useMemo<PTTContextValue>(() => ({
        activeChannel,
        setActiveChannel,
        isTalking,
        isConnected,
        micPermission,
        inputMode,
        startTalking,
        stopTalking,
        toggleTalking,
        liveTranscript,
        callLog,
        clearCallLog,
        liveSpeakers,
        onTransmissionEnd: onTransmissionEndRef.current,
        setOnTransmissionEnd,
    }), [
        activeChannel, isTalking, isConnected, micPermission, inputMode,
        startTalking, stopTalking, toggleTalking, liveTranscript, callLog,
        clearCallLog, liveSpeakers, setOnTransmissionEnd,
    ]);

    return (
        <PTTContext.Provider value={value}>
            {children}
        </PTTContext.Provider>
    );
}
