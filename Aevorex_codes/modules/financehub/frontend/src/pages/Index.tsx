import React from "react";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatPanel } from "../components/chat/ChatPanel.view";
import { GlobalHeader } from "../components/layout/GlobalHeader.view";
import { TickerTape } from "../components/market/TickerTape.view";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <GlobalHeader />
      <TickerTape />
      <ChatHeader />
      <main className="flex-1">
        <ChatPanel />
      </main>
    </div>
  );
};

export default Index; 