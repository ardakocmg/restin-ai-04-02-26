import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SafeModeContext = createContext(null);

export const useSafeMode = () => {
  const context = useContext(SafeModeContext);
  if (!context) {
    return { isSafeMode: false, setSafeMode: () => {}, safeNavigate: (path) => path };
  }
  return context;
};

export const SafeModeProvider = ({ children }) => {
  const [isSafeMode, setIsSafeModeState] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [sendInProgress, setSendInProgressState] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Auto-detect safe mode based on route
    const isPOSRoute = location.pathname.startsWith('/pos');
    const isKDSRoute = location.pathname.startsWith('/kds');
    const shouldBeSafe = isPOSRoute || isKDSRoute || hasActiveOrder || sendInProgress;
    
    if (shouldBeSafe !== isSafeMode) {
      setIsSafeModeState(shouldBeSafe);
    }
  }, [location.pathname, hasActiveOrder, sendInProgress, isSafeMode]);

  const setSafeMode = (active, reason) => {
    console.log(`[SafeMode] ${active ? 'ACTIVATED' : 'DEACTIVATED'}: ${reason || 'manual'}`);
    setIsSafeModeState(active);
  };

  const setOrderActive = (active) => {
    setHasActiveOrder(active);
  };

  const setSendInProgress = (inProgress) => {
    setSendInProgressState(inProgress);
  };

  const safeNavigate = (navigate, path, options = {}) => {
    if (isSafeMode && !options.force) {
      console.warn('[SafeMode] Navigation blocked to:', path);
      return false;
    }
    navigate(path, options);
    return true;
  };

  return (
    <SafeModeContext.Provider value={{
      isSafeMode,
      isKDSRoute: location.pathname.startsWith('/kds'),
      isPOSRoute: location.pathname.startsWith('/pos'),
      setSafeMode,
      setOrderActive,
      setSendInProgress,
      sendInProgress,
      safeNavigate
    }}>
      {children}
    </SafeModeContext.Provider>
  );
};
