import React, { createContext, useContext, useState, useCallback } from "react";

export type ChatModel = {
  id: string;
  label: string;
  cost: string; // e.g. "$0.50/1K"
  speed: string; // e.g. "⚡⚡"
};

const DEFAULT_MODELS: ChatModel[] = [
  { id: "gemini-flash", label: "Gemini Flash", cost: "$0.10/1K", speed: "⚡⚡⚡" },
  { id: "gemini-pro", label: "Gemini Pro", cost: "$0.30/1K", speed: "⚡⚡" },
];

interface ModelContextValue {
  currentModel: ChatModel;
  setModel: (m: ChatModel) => void;
  models: ChatModel[];
}

const ModelContext = createContext<ModelContextValue | undefined>(undefined);

export const ModelProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentModel, setCurrentModel] = useState<ChatModel>(() => {
    const stored = localStorage.getItem("fh_current_model");
    const found = DEFAULT_MODELS.find((m) => m.id === stored);
    return found ?? DEFAULT_MODELS[0];
  });

  const setModel = useCallback((m: ChatModel) => {
    setCurrentModel(m);
    localStorage.setItem("fh_current_model", m.id);
    window.dispatchEvent(new CustomEvent("fh-model-changed", { detail: m.id }));
  }, []);

  return (
    <ModelContext.Provider value={{ currentModel, setModel, models: DEFAULT_MODELS }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
}; 