import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RuntimeContext = createContext(null);

export const useRuntime = () => {
  const context = useContext(RuntimeContext);
  if (!context) {
    return { 
      appMode: 'ADMIN', 
      safeMode: false, 
      navigationLock: false,
      setNavigationLock: () => {}
    };
  }
  return context;
};

export const RuntimeProvider = ({ children }) => {
  const [appMode, setAppMode] = useState('ADMIN');
  const [safeMode, setSafeModeState] = useState(false);
  const [navigationLock, setNavigationLock] = useState(false);
  const [lastGoodRoute, setLastGoodRoute] = useState('/');
  const location = useLocation();

  useEffect(() => {
    // Detect app mode from route
    if (location.pathname.startsWith('/pos')) {
      setAppMode('POS');
      setSafeModeState(true);
    } else if (location.pathname.startsWith('/kds')) {
      setAppMode('KDS');
      setSafeModeState(true);
    } else if (location.pathname.startsWith('/admin')) {
      setAppMode('ADMIN');
      setSafeModeState(false); // Admin can have controlled redirects
    } else {
      setAppMode('PUBLIC');
      setSafeModeState(false);
    }
    
    // Save last good route (not login/error pages)
    if (!location.pathname.includes('/login') && !location.pathname.includes('/error')) {
      setLastGoodRoute(location.pathname);
      localStorage.setItem('restin_last_route', location.pathname);
    }
  }, [location.pathname]);

  const setSafeMode = (active, reason) => {
    console.log(`[Runtime] SafeMode ${active ? 'ON' : 'OFF'}: ${reason || ''}`);
    setSafeModeState(active);
  };

  const safeNavigate = (navigate, path, options = {}) => {
    if ((safeMode || navigationLock) && !options.force) {
      console.warn(`[Runtime] Navigation blocked to ${path} (safeMode=${safeMode}, locked=${navigationLock})`);
      return false;
    }
    navigate(path, options);
    return true;
  };

  return (
    <RuntimeContext.Provider value={{
      appMode,
      safeMode,
      navigationLock,
      lastGoodRoute,
      setAppMode,
      setSafeMode,
      setNavigationLock,
      safeNavigate
    }}>
      {children}
    </RuntimeContext.Provider>
  );
};
