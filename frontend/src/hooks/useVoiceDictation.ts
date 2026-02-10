import { useState, useRef, useCallback } from 'react';

// ─── SpeechRecognition Types ────────────────────────────────────────────
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
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
    const w = window as unknown as Record<string, unknown>;
    return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor | null;
};

// ─── Text-to-Speech Utility ─────────────────────────────────────────────
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakMessage(text: string): boolean {
    if (!('speechSynthesis' in window)) return false;

    // Stop any currently playing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || voices[0];
    if (englishVoice) utterance.voice = englishVoice;

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
}

export function stopSpeaking(): void {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}

export function isSpeaking(): boolean {
    return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}

// ─── Voice Dictation Hook ───────────────────────────────────────────────
// This hook provides a simple "press mic, speak, text appears in input" flow.
// Uses the free Web Speech API — works in Chrome, Edge, Safari.

interface UseVoiceDictationOptions {
    onResult?: (text: string) => void; // Called with final transcript
    onInterim?: (text: string) => void; // Called with interim (live) text
    lang?: string;
}

interface UseVoiceDictationReturn {
    isListening: boolean;
    interimText: string;
    startDictation: () => void;
    stopDictation: () => void;
    toggleDictation: () => void;
    isSupported: boolean;
}

export function useVoiceDictation(options: UseVoiceDictationOptions = {}): UseVoiceDictationReturn {
    const { onResult, onInterim, lang = 'en-US' } = options;
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const finalBufferRef = useRef('');

    const SR = getSpeechRecognition();
    const isSupported = SR !== null;

    const startDictation = useCallback(() => {
        if (!SR) return;
        // Stop any existing
        try { recognitionRef.current?.stop(); } catch { /* */ }

        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalBufferRef.current += transcript;
                    onResult?.(finalBufferRef.current.trim());
                } else {
                    interim += transcript;
                }
            }
            const liveText = finalBufferRef.current + interim;
            setInterimText(liveText);
            onInterim?.(liveText);
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognition.onend = () => {
            // If still supposed to be listening, restart (browser can auto-stop)
            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch { setIsListening(false); }
            }
        };

        recognitionRef.current = recognition;
        finalBufferRef.current = '';
        setInterimText('');
        setIsListening(true);

        try {
            recognition.start();
        } catch {
            setIsListening(false);
        }
    }, [SR, lang, onResult, onInterim]);

    const stopDictation = useCallback(() => {
        if (recognitionRef.current) {
            const ref = recognitionRef.current;
            recognitionRef.current = null; // Prevent restart in onend
            try { ref.stop(); } catch { /* */ }
        }
        setIsListening(false);
        // Deliver final text
        if (finalBufferRef.current.trim()) {
            onResult?.(finalBufferRef.current.trim());
        }
        setInterimText('');
    }, [onResult]);

    const toggleDictation = useCallback(() => {
        if (isListening) {
            stopDictation();
        } else {
            startDictation();
        }
    }, [isListening, startDictation, stopDictation]);

    return {
        isListening,
        interimText,
        startDictation,
        stopDictation,
        toggleDictation,
        isSupported,
    };
}
