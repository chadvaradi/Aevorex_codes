import React from "react";
import { useModelSwitcher } from "./ModelSwitcher.logic";
import { cn } from "@/lib/utils";

export const ModelSwitcher = () => {
  const {
    isOpen,
    toggle,
    close,
    select,
    highlightIndex,
    models,
    currentModel,
  } = useModelSwitcher();

  return (
    <div className="relative inline-block">
      <button
        id="chat-model-btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggle}
        className="px-3 py-1 text-sm font-medium bg-secondary rounded-md border border-border hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Mode: {currentModel.label}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="z-50 w-[90vw] max-w-xs max-h-[60vh] overflow-y-auto bg-popover text-popover-foreground rounded-lg shadow-2xl ring-1 ring-border animate-[fadeIn_150ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <ul role="listbox" className="divide-y divide-border">
              {models.map((m, idx) => (
                <li
                  key={m.id}
                  role="option"
                  aria-selected={currentModel.id === m.id}
                  onClick={() => select(m)}
                  className={cn(
                    "px-4 py-3 cursor-pointer",
                    idx === highlightIndex && "bg-accent",
                    currentModel.id === m.id && "bg-accent/50"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span>{m.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.speed} | {m.cost}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}; 