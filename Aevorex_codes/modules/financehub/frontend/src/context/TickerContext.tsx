// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from "react";

interface TickerContextValue {
  ticker: string;
  setTicker: (t: string) => void;
}

const TickerContext = createContext<TickerContextValue | undefined>(undefined);

export const TickerProvider = ({ children }: { children: React.ReactNode }) => {
  const [ticker, _setTicker] = useState(() => {
    return localStorage.getItem("fh_current_ticker") || "AAPL";
  });

  const setTicker = useCallback((t: string) => {
    _setTicker(t.toUpperCase());
    localStorage.setItem("fh_current_ticker", t.toUpperCase());
    window.dispatchEvent(new CustomEvent("fh-ticker-changed", { detail: t.toUpperCase() }));
  }, []);

  return (
    <TickerContext.Provider value={{ ticker, setTicker }}>{children}</TickerContext.Provider>
  );
};

export const useTicker = () => {
  const ctx = useContext(TickerContext);
  if (!ctx) throw new Error("useTicker must be used within TickerProvider");
  return ctx;
}; 