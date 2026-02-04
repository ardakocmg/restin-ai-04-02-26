
/**
 * voice.ts - Web Speech API Wrapper for KDS (Rule #34)
 */

export class VoiceOps {
    private synthesis: SpeechSynthesis | null = null;

    constructor() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.synthesis = window.speechSynthesis;
        }
    }

    announce(text: string) {
        if (!this.synthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        this.synthesis.speak(utterance);
    }

    listen(onCommand: (text: string) => void) {
        // Placeholder for SpeechRecognition API
        console.log('[VoiceOps] Listening...');
    }
}

export const voiceOps = new VoiceOps();
