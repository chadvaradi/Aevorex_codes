import React from "react";
import { ModelSwitcher } from "./ModelSwitcher.view";
import { TickerSwitcher } from "./TickerSwitcher.view";

export const ChatHeader = () => {
  return (
    <header className="w-full flex items-center justify-between py-2 border-b border-border">
      <h2 className="text-sm font-semibold">FinanceHub Chat</h2>
      <div className="flex gap-2">
        <TickerSwitcher />
        <ModelSwitcher />
      </div>
    </header>
  );
}; 