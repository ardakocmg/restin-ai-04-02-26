/**
 * Push-to-Talk Walkie Talkie Hook — WebRTC Audio
 * Rule #40 & #51: Native PTT Voice Mesh
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface WalkieTalkieState {
    isTalking: boolean;
    isConnected: boolean;
    activePeers: number;
    startTalking: () => void;
    stopTalking: () => void;
    micPermission: 'granted' | 'denied' | 'prompt';
}

export const useWalkieTalkie = (channelId: string): WalkieTalkieState => {
    const [isTalking, setIsTalking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    const localStream = useRef<MediaStream | null>(null);

    // Get Microphone Access on mount
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

    const startTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = true;
        });
        setIsTalking(true);
    }, []);

    const stopTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = false;
        });
        setIsTalking(false);
    }, []);

    return {
        isTalking,
        isConnected,
        activePeers: peers.length,
        startTalking,
        stopTalking,
        micPermission,
    };
};
