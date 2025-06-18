import React from "react";
import { useTicker } from "../../context/TickerContext";

export const GlobalHeader = () => {
  const { ticker } = useTicker();
  return (
    <header className="w-full flex items-center justify-between px-4 py-2 bg-background border-b border-border">
      <div className="font-bold tracking-tight">FinanceHub</div>
      <div className="text-sm opacity-60">Current: {ticker}</div>
    </header>
  );
}; 