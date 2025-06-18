// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useModel } from "../../context/ModelContext";
import { useTicker } from "../../context/TickerContext";
import { cn } from "../../lib/utils";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export const ChatPanel = () => {
  const { currentModel } = useModel();
  const { ticker } = useTicker();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const viewRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll
  useEffect(() => {
    if (viewRef.current) viewRef.current.scrollTop = viewRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    const ctrl = new AbortController();
    const url = `http://localhost:8084/api/v1/stock/chat/${ticker}/stream`;
    const body = {
      message: input,
      history: messages.map((m) => ({ role: m.role, content: m.text })),
      config_override: { model: currentModel.id },
    };
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      let buffer = "";
      const assistantMsg: Msg = { role: "assistant", text: "" };
      setMessages((m) => [...m, assistantMsg]);

      // Robust SSE parser – backend sends lines like `data: {json}\n\n`
      const textDecoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += textDecoder.decode(value, { stream: true });

        // Process any complete events (separated by double CRLF / LF)
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);

          if (!rawEvent.startsWith("data:")) continue;
          const jsonStr = rawEvent.slice(5).trim();
          let payload: any;
          try {
            payload = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (payload.type === "token") {
            assistantMsg.text += payload.content;
            setMessages((m) => [...m.slice(0, -1), { ...assistantMsg }]);
          }
          // TODO: handle ask_deep etc. later
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col w-full h-full max-h-[calc(100vh_-_56px)]">
      <div
        ref={viewRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg p-3 text-sm max-w-prose",
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted text-muted-foreground"
            )}
          >
            {m.text || <span className="opacity-50">…</span>}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border flex gap-2">
        <input
          className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Írj ide…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="px-4 py-2 text-sm font-medium bg-primary rounded-md text-primary-foreground hover:bg-primary/90"
        >
          Küldés
        </button>
      </div>
    </div>
  );
}; 