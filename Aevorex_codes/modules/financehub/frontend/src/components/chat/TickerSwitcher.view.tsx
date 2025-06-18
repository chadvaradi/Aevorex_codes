// @ts-nocheck
import React from "react";
import { useTicker } from "../../context/TickerContext";

const COMMONS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];

export const TickerSwitcher = () => {
  const { ticker, setTicker } = useTicker();

  return (
    <select
      value={ticker}
      onChange={(e) => setTicker(e.target.value)}
      className="px-3 py-1 text-sm border rounded-md bg-secondary hover:bg-secondary/80 focus:outline-none"
    >
      {COMMONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}; 