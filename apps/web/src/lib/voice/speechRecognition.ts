import { useState, useEffect, useCallback } from 'react';

// Rule #34: Voice Ops (Wake-word / Push-to-Talk)

interface VoiceCommand {
    trigger: string;
    action: (args?: string) => void;
}

export const useVoiceOps = (commands: VoiceCommand[]) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState<string | null>(null);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Web Speech API not supported.");
            return;
        }

        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const text = lastResult[0].transcript.trim().toLowerCase();
            setTranscript(text);

            console.log(`[VOICE] Hearing: "${text}"`);

            // Match Commands
            commands.forEach(cmd => {
                const trigger = cmd.trigger.toLowerCase();
                if (text.includes(trigger)) {
                    console.log(`[VOICE] Matched: ${trigger}`);
                    setLastCommand(trigger);
                    // Extract args if needed (e.g. "Bump Ticket 4" -> extract 4)
                    const args = text.replace(trigger, '').trim();
                    cmd.action(args);
                }
            });
        };

        try {
            recognition.start();
        } catch (e) { /* ignore already started */ }

        return () => {
            recognition.stop();
        };
    }, [commands]);

    return { isListening, transcript, lastCommand };
};
