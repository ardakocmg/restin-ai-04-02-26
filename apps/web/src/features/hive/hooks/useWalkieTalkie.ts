import { useEffect, useRef, useState, useCallback } from 'react';

// Rule #40 & #51: Native PTT Voice Mesh (WebRTC)

export const useWalkieTalkie = (channelId: string) => {
    const [isTalking, setIsTalking] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);

    // Refs for Media
    const localStream = useRef<MediaStream | null>(null);
    // const connections = useRef<Map<string, RTCPeerConnection>>(new Map());

    // 1. Get Microphone Access (Once)
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                localStream.current = stream;
                // Mute by default (PTT Logic)
                stream.getAudioTracks().forEach(track => track.enabled = false);
            })
            .catch(err => console.error("[bP] Mic Access Denied", err));
    }, []);

    // 2. PTT Actions
    const startTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => track.enabled = true);
        setIsTalking(true);
        // Signal: "User X is talking" (Visual Indicator)
    }, []);

    const stopTalking = useCallback(() => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => track.enabled = false);
        setIsTalking(false);
    }, []);

    return {
        isTalking,
        startTalking,
        stopTalking,
        activePeers: peers.length
    };
};
