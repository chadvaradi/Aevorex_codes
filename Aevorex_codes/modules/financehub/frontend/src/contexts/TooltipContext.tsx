// @ts-nocheck
import React, { createContext, useContext, PropsWithChildren } from "react";

// Simple placeholder context – can be extended with real tooltip logic later
const TooltipContext = createContext(null);

export const TooltipProvider = ({ children }) => (
  <TooltipContext.Provider value={null}>{children}</TooltipContext.Provider>
);

export const useTooltip = () => useContext(TooltipContext);

export default TooltipContext; 