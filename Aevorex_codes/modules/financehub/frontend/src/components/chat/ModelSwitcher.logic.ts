import { useEffect, useState, useCallback } from "react";
import { ChatModel, useModel } from "@/context/ModelContext";

export const useModelSwitcher = () => {
  const { models, currentModel, setModel } = useModel();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const toggle = useCallback(() => setIsOpen((o) => !o), []);
  const close = useCallback(() => setIsOpen(false), []);

  const select = useCallback(
    (m: ChatModel) => {
      setModel(m);
      close();
    },
    [setModel, close]
  );

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
      if (!isOpen) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown")
        setHighlightIndex((i) => (i + 1) % models.length);
      if (e.key === "ArrowUp")
        setHighlightIndex((i) => (i - 1 + models.length) % models.length);
      if (e.key === "Enter") {
        select(models[highlightIndex]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle, close, isOpen, models, highlightIndex, select]);

  return { isOpen, toggle, close, select, highlightIndex, models, currentModel };
}; 