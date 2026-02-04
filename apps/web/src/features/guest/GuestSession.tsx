import React from 'react';

// Rule #35: Guest Mode (App Clips) / Rule #58: Data Sovereignty
export default function GuestSession({ tableId }: { tableId: string }) {
    return (
        <div className="min-h-screen bg-white text-black p-6">
            <h1 className="text-3xl font-bold mb-4">Welcome to Table {tableId}</h1>
            <p className="mb-8 text-gray-600">Scan QR to order & pay instantly.</p>

            <div className="p-4 bg-gray-100 rounded-lg text-center mb-8">
                📲 [Apple Pay] [Google Pay]
            </div>

            <button className="w-full py-4 bg-black text-white font-bold rounded-xl">
                View Menu
            </button>
        </div>
    );
}
