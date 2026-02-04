import React, { createContext, useContext, useEffect, useState } from "react";

const UISettingsContext = createContext(null);

export const useUISettings = () => {
  const ctx = useContext(UISettingsContext);
  if (!ctx) {
    // Safe fallback
    return {
      debugMode: false,
      setDebugMode: () => {},
      locale: "en",
      setLocale: () => {},
      errorCopy: {
        genericTitle: "Something went wrong",
        genericBody: "Please refresh the page. If this persists, contact your manager.",
        kitchenBody: "Temporary system issue. Please retry.",
        staffBody: "Temporary system issue. Please call your manager."
      },
      setErrorCopy: () => {}
    };
  }
  return ctx;
};

export function UISettingsProvider({ children }) {
  const [debugMode, setDebugMode] = useState(false);
  const [locale, setLocale] = useState("en");
  const [errorCopy, setErrorCopy] = useState({
    genericTitle: "Something went wrong",
    genericBody: "Please refresh the page. If this persists, contact your manager.",
    kitchenBody: "Temporary system issue. Please retry.",
    staffBody: "Temporary system issue. Please call your manager."
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("restin_ui_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.debugMode === "boolean") setDebugMode(parsed.debugMode);
        if (parsed.errorCopy) setErrorCopy({ ...errorCopy, ...parsed.errorCopy });
        if (parsed.locale) setLocale(parsed.locale);
      }
    } catch {}
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "restin_ui_settings",
      JSON.stringify({ debugMode, locale, errorCopy })
    );
  }, [debugMode, locale, errorCopy]);

  return (
    <UISettingsContext.Provider
      value={{ debugMode, setDebugMode, locale, setLocale, errorCopy, setErrorCopy }}
    >
      {children}
    </UISettingsContext.Provider>
  );
}
