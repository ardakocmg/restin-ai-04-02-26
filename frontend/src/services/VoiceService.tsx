/**
 * Voice Service - Speech recognition using Web Speech API
 * @module services/VoiceService
 */

// Web Speech API interfaces (not included in standard TS lib)
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    readonly isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

class VoiceService {
    private recognition: SpeechRecognitionInstance | null = null;
    private isListening = false;

    constructor() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognitionClass) {
                this.recognition = new SpeechRecognitionClass();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';
            }
        }
    }

    isSupported(): boolean {
        return this.recognition !== null;
    }

    startRecording(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.isSupported() || !this.recognition) {
                reject(new Error('Speech recognition not supported'));
                return;
            }

            this.isListening = true;

            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                this.isListening = false;
                resolve(transcript);
            };

            this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                this.isListening = false;
                reject(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
            };

            try {
                this.recognition.start();
            } catch (error: unknown) {
                this.isListening = false;
                reject(error);
            }
        });
    }

    stopRecording(): void {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    getIsListening(): boolean {
        return this.isListening;
    }
}

export default VoiceService;
