import React from 'react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';

export default function KDSView() {
    const handleVoice = (cmd: string) => {
        alert(`Voice Command: ${cmd}`);
    };

    const { isListening, transcript } = useVoiceCommands(handleVoice);

    return (
        <div className="p-8 bg-black min-h-screen text-green-500 font-mono">
            <h1 className="text-4xl font-bold mb-8">KITCHEN DISPLAY SYSTEM</h1>

            <div className="mb-8 p-4 border border-green-800 rounded">
                <div className="text-sm text-green-700">VOICE OPS STATUS</div>
                <div>{isListening ? "LISTENING..." : "OFFLINE"}</div>
                <div className="text-white mt-1">&quot;{transcript}&quot;</div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="border border-green-600 p-4 rounded bg-green-900/10">
                        <div className="flex justify-between border-b border-green-600 pb-2 mb-2">
                            <span className="font-bold text-xl">TABLE {i}</span>
                            <span>12:0{i}</span>
                        </div>
                        <ul className="space-y-2">
                            <li>1x Burger</li>
                            <li>2x Fries</li>
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
