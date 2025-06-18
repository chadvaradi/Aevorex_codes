// @ts-nocheck
import React from "react";
import Index from "./pages/Index";
import LegacyBridge from "./legacy/LegacyBridge";
import { LegacyHeaderPortal } from "./components/legacy/LegacyHeaderPortal";
import { LegacyTickerTapePortal } from "./components/legacy/LegacyTickerTapePortal";
import { LegacyStockHeaderPortal } from "./components/legacy/LegacyStockHeaderPortal";
import { LegacyChartPortal } from "./components/legacy/LegacyChartPortal";
import { LegacyAnalysisBubblesPortal } from "./components/legacy/LegacyAnalysisBubblesPortal";
import { LegacyFooterPortal } from "./components/legacy/LegacyFooterPortal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ModelProvider } from "./context/ModelContext";
import { TickerProvider } from "./context/TickerContext";
import { TooltipProvider } from "./context/TooltipContext";
import { Toaster } from "./components/Toaster";
import { Sonner } from "./components/Sonner";
// Legacy portals removed – full React migration in progress

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ModelProvider>
      <TickerProvider>
        <TooltipProvider>
          <LegacyBridge />
          {import.meta.env.VITE_USE_LEGACY === 'true' && (
            <>
              <LegacyHeaderPortal />
              <LegacyTickerTapePortal />
              <LegacyStockHeaderPortal />
              <LegacyChartPortal />
              <LegacyAnalysisBubblesPortal />
              <LegacyFooterPortal />
            </>
          )}

          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TickerProvider>
    </ModelProvider>
  </QueryClientProvider>
);

export default App; 