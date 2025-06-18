import React from "react";
import { useTicker } from "../../context/TickerContext";
import { useTickerTapeData } from "./useTickerTapeData";

export const TickerTape = () => {
  const { setTicker } = useTicker();
  const { data, isLoading } = useTickerTapeData(30);

  if (isLoading) return null;

  return (
    <div className="w-full overflow-hidden bg-muted border-b border-border whitespace-nowrap text-xs select-none">
      <div className="animate-[ticker-scroll_40s_linear_infinite] inline-block">
        {data?.map((t) => {
          const changePositive = t.change_pct >= 0;
          return (
            <button
              key={t.symbol}
              onClick={() => setTicker(t.symbol)}
              className="inline-flex items-center gap-1 px-4 py-1 hover:bg-accent focus:outline-none"
            >
              <span className="font-semibold">{t.symbol}</span>
              <span>{t.price.toFixed(2)}</span>
              <span
                className={changePositive ? "text-green-500" : "text-red-500"}
              >
                {changePositive ? "+" : ""}
                {t.change_pct.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
      {/* keyframes in tailwind config extension */}
    </div>
  );
}; 