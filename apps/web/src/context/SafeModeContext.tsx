'use client';
import React, { createContext, useContext, useState } from 'react';

const SafeModeContext = createContext({
    safeMode: false,
    setSafeMode: (mode: boolean) => { },
    orderActive: false,
    setOrderActive: (active: boolean) => { },
    sendInProgress: false,
    setSendInProgress: (progress: boolean) => { }
});

export const SafeModeProvider = ({ children }: { children: React.ReactNode }) => {
    const [safeMode, setSafeMode] = useState(false);
    const [orderActive, setOrderActive] = useState(false);
    const [sendInProgress, setSendInProgress] = useState(false);

    return (
        <SafeModeContext.Provider value={{
            safeMode, setSafeMode,
            orderActive, setOrderActive,
            sendInProgress, setSendInProgress
        }}>
            {children}
        </SafeModeContext.Provider>
    );
};

export const useSafeMode = () => useContext(SafeModeContext);
