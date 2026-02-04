import { useEffect, useState } from 'react';

// Rule #34: Voice Ops / Wake-word
export const useVoiceCommands = (onCommand: (cmd: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Browser does not support Web Speech API");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const text = lastResult[0].transcript.trim().toLowerCase();
            setTranscript(text);

            console.log(`[VOICE] Heard: ${text}`);

            if (text.includes('bump')) {
                onCommand('BUMP');
            } else if (text.includes('fire')) {
                onCommand('FIRE');
            }
        };

        recognition.start();
        setIsListening(true);

        return () => {
            recognition.stop();
        };
    }, [onCommand]);

    return { isListening, transcript };
};
