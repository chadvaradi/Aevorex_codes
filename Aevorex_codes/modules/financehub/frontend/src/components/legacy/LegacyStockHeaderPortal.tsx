import React, { useEffect } from "react";

export const LegacyStockHeaderPortal = () => {
  useEffect(() => {
    const sectionId = "stock-header-section";
    let section = document.getElementById(sectionId);
    if (!section) {
      section = document.createElement("section");
      section.id = sectionId;
      section.className = "fh-stock-header stock-header-premium";
      section.innerHTML = `
        <div id="fh-stock-header" class="hidden"></div>
        <div class="fh-stock-header__container stock-header-left stock-header-container">
          <div class="fh-stock-header__content hidden" id="fh-stock-header-content">
            <div class="fh-stock-header__row fh-stock-header__row--primary">
              <span class="fh-stock-header__symbol" id="stock-symbol-display"></span>
              <span class="fh-stock-header__company" id="stock-company-name"></span>
            </div>
            <div class="fh-stock-header__row fh-stock-header__row--price">
              <span class="fh-stock-header__price" id="stock-current-price">$0.00</span>
              <span class="fh-stock-header__change" id="stock-change">+0.00%</span>
            </div>
            <div class="fh-stock-header__row fh-stock-header__row--meta">
              <span class="fh-stock-header__meta-item">Prev Close <span id="fh-previous-close">-</span></span>
              <span class="fh-stock-header__meta-item">Market Cap <span id="fh-market-cap">-</span></span>
              <span class="fh-stock-header__meta-item">Vol <span id="stock-volume">-</span></span>
              <span class="fh-stock-header__meta-item">Day Range <span id="stock-day-range">-</span></span>
              <span class="fh-stock-header__meta-item">Exch <span id="stock-exchange">-</span></span>
              <span class="fh-stock-header__meta-item" id="stock-market-status">Market Closed</span>
            </div>
          </div>
        </div>`;
      // Insert after ticker tape container if exists else after header
      const tickerEl = document.getElementById("ticker-tape-container");
      if (tickerEl && tickerEl.parentNode) {
        const parentEl = tickerEl.parentNode as HTMLElement;
        parentEl.insertAdjacentElement("afterend", section);
      } else {
        document.body.insertBefore(section, document.body.firstChild);
      }
    }

    // Initialise legacy manager if available
    let mgrInst: unknown = null;
    const LegacyCtor = (window as any).StockHeaderManager;
    if (typeof LegacyCtor === "function") {
      try {
        mgrInst = new LegacyCtor();
        if (typeof (mgrInst as any).initialize === "function") {
          (mgrInst as any).initialize();
        }
      } catch (err) {
        console.error("LegacyStockHeaderPortal: StockHeaderManager init error", err);
      }
    }

    return () => {
      if (mgrInst && typeof (mgrInst as any).destroy === "function") {
        try { (mgrInst as any).destroy(); } catch {}
      }
    };
  }, []);

  return null;
}; 