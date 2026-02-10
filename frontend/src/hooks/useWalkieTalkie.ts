/**
 * Push-to-Talk Walkie Talkie Hook — WebRTC Audio
 * Rule #40 & #51: Native PTT Voice Mesh
 * 
 * Supports 3 input modes:
 * 1. Touch/Mouse hold (onMouseDown/onTouchStart)
 * 2. Keyboard hold (Space bar)
 * 3. AirPods/Bluetooth toggle (MediaSession API - play/pause)
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface WalkieTalkieState {
    isTalking: boolean;
    isConnected: boolean;
    activePeers: number;
    startTalking: () => void;
    stopTalking: () => void;
    toggleTalking: () => void;
    micPermission: 'granted' | 'denied' | 'prompt';
    inputMode: 'hold' | 'toggle' | 'keyboard';
}

export const useWalkieTalkie = (channelId: string): WalkieTalkieState => {
    const [isTalking, setIsTalking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [inputMode, setInputMode] = useState<'hold' | 'toggle' | 'keyboard'>('hold');

    const localStream = useRef<MediaStream | null>(null);
    const isTalkingRef = useRef(false); // Ref for MediaSession callbacks (closures)

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
                // Mute by default (PTT — only unmute while holding button)
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

    // ─── Core PTT Controls ──────────────────────────────────────────────
    const startTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = true;
        });
        setIsTalking(true);
        isTalkingRef.current = true;
    }, []);

    const stopTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = false;
        });
        setIsTalking(false);
        isTalkingRef.current = false;
    }, []);

    const toggleTalking = useCallback(() => {
        if (isTalkingRef.current) {
            stopTalking();
        } else {
            startTalking();
        }
        setInputMode('toggle');
    }, [startTalking, stopTalking]);

    // ─── AirPods / Bluetooth: MediaSession API ──────────────────────────
    // Squeeze AirPods Pro stem or tap AirPods → sends play/pause media event
    // We intercept this to toggle PTT on/off
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        try {
            // Set metadata so AirPods shows PTT info on the lock screen
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `PTT — #${channelId}`,
                artist: 'Restin.AI Walkie-Talkie',
                album: 'Hive Communications',
            });

            // AirPods squeeze → play = start talking
            navigator.mediaSession.setActionHandler('play', () => {
                if (!isTalkingRef.current) {
                    startTalking();
                    setInputMode('toggle');
                }
            });

            // AirPods squeeze again → pause = stop talking
            navigator.mediaSession.setActionHandler('pause', () => {
                if (isTalkingRef.current) {
                    stopTalking();
                    setInputMode('toggle');
                }
            });

            // AirPods double tap on some models
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                toggleTalking();
            });
        } catch {
            // MediaSession not fully supported in this browser
        }

        return () => {
            try {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
            } catch {
                // Cleanup silently
            }
        };
    }, [channelId, startTalking, stopTalking, toggleTalking]);

    // ─── Keyboard: Space bar hold ───────────────────────────────────────
    // Hold Space = talk, release = stop (classic PTT)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only activate if no input/textarea is focused
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

    return {
        isTalking,
        isConnected,
        activePeers: peers.length,
        startTalking,
        stopTalking,
        toggleTalking,
        micPermission,
        inputMode,
    };
};
