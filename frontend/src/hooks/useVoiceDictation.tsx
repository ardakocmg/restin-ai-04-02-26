import { useCallback, useRef, useState } from 'react';

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
    const w = window as/**/any as /**/any;
    return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor | null;
};

// ─── TTS Configuration ──────────────────────────────────────────────────
export interface TTSConfig {
    rate?: number;         // 0.5 - 2.0, default 1.4
    pitch?: number;        // 0.5 - 2.0, default 1.0
    volume?: number;       // 0.0 - 1.0, default 1.0
    voiceName?: string;    // Name of specific voice to use
    lang?: string;         // e.g. 'en-US', 'en-GB'
}

// ─── Speech Recognition Supported Languages ─────────────────────────────
export const SUPPORTED_LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'en-AU', label: 'English (AU)' },
    { code: 'mt-MT', label: 'Maltese' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'de-DE', label: 'German' },
    { code: 'fr-FR', label: 'French' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'tr-TR', label: 'Turkish' },
    { code: 'ar-SA', label: 'Arabic' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'ja-JP', label: 'Japanese' },
] as const;

// ─── Text-to-Speech Utility ─────────────────────────────────────────────
let _currentUtterance: SpeechSynthesisUtterance | null = null;

/** List all available TTS voices from the browser */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
}

export function speakMessage(text: string, config: TTSConfig = {}): boolean {
    if (!('speechSynthesis' in window)) return false;

    // Stop any currently playing speech
    window.speechSynthesis.cancel();

    const {
        rate = 1.4,
        pitch = 1.0,
        volume = 1.0,
        voiceName,
        lang,
    } = config;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Voice selection priority: explicit voiceName > lang match > any English > first
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (voiceName) {
        selectedVoice = voices.find(v => v.name === voiceName);
    }
    if (!selectedVoice && lang) {
        selectedVoice = voices.find(v => v.lang.startsWith(lang));
    }
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || voices[0];
    }
    if (selectedVoice) utterance.voice = selectedVoice;

    _currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
}

export function stopSpeaking(): void {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    _currentUtterance = null;
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
