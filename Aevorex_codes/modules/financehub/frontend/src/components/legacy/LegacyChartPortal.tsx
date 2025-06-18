import React, { useEffect } from "react";

export const LegacyChartPortal = () => {
  useEffect(() => {
    const sectionId = "chart-section";
    let section = document.getElementById(sectionId);
    if (!section) {
      section = document.createElement("section");
      section.id = sectionId;
      section.className = "fh-chart";
      section.innerHTML = `
        <div id="fh-chart-container" class="fh-chart__container" data-legacy-id="chart-container" data-compat="true">
          <div class="fh-chart__content">
            <div id="tradingview-chart" class="fh-chart__tradingview" data-alias="chart-widget"></div>
            <div class="fh-chart__loading" id="chart-loading" style="display: none;">
              <div class="fh-chart__loading-spinner"></div>
            </div>
          </div>
          <div id="tv-ta-panel" class="fh-chart__ta-panel" aria-label="Technical analysis panel"></div>
        </div>`;
      // insert after stock header
      const stockHeader = document.getElementById("stock-header-section");
      if (stockHeader && stockHeader.parentNode) {
        (stockHeader.parentNode as HTMLElement).insertAdjacentElement("afterend", section);
      } else {
        document.body.appendChild(section);
      }
    }

    // AutoInit is self contained in chart.js, but ensure chartManager created later can refer to correct theme updates
    return () => {
      if ((window as any).chartManager && typeof (window as any).chartManager.destroy === "function") {
        try { (window as any).chartManager.destroy(); } catch {}
        (window as any).chartManager = null;
      }
    };

    // AutoInject TradingView library if missing (dev mode)
    if (!(window as any).TradingView) {
      const existing = document.querySelector<HTMLScriptElement>("script[data-tv]");
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.setAttribute("data-tv", "1");
        document.head.appendChild(s);
      }
    }
  }, []);

  return null;
}; 