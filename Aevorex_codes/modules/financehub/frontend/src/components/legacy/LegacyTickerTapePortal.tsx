import React, { useEffect } from "react";

/**
 * LegacyTickerTapePortal
 * --------------------------------------------------
 * 1. Létrehoz egy <div id="ticker-tape-container"> elemet a DOM-ban, közvetlenül a
 *    header után (ha még nem létezik).
 * 2. Dinamikusan példányosítja a `TickerTapeUnified` legacy osztályt és meghívja
 *    az `init()` metódust, így a régi ticker-szalag azonnal működik React alatt is.
 * 3. Komponens unmountnál hívja a `destroy()` metódust, hogy ne szivárogjanak
 *    event listenerek / timers.
 */
export const LegacyTickerTapePortal = () => {
  useEffect(() => {
    const containerId = "ticker-tape-container";

    // 1️⃣  – Container biztosítása
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      // Insert right after the header element if present, else at body start
      const headerEl = document.getElementById("fh-legacy-header") ?? document.querySelector("header");
      if (headerEl && headerEl.parentNode) {
        headerEl.parentNode.insertBefore(container, headerEl.nextSibling);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    // 2️⃣  – Legacy osztály példányosítása
    let tickerInstance: unknown = null;
    const LegacyCtor = (window as any).TickerTapeUnified;
    if (typeof LegacyCtor === "function") {
      try {
        tickerInstance = new LegacyCtor(containerId, {
          apiClient: (window as any).FinanceHubAPI ?? undefined,
        });
        if (typeof (tickerInstance as any).init === "function") {
          (tickerInstance as any).init();
        }
      } catch (err) {
        console.error("LegacyTickerTapePortal: nem sikerült inicializálni a TickerTapeUnified komponenst", err);
      }
    } else {
      console.warn("LegacyTickerTapePortal: TickerTapeUnified nincs betöltve (ellenőrizd GlobalAdapter importot)");
    }

    // 3️⃣  – Cleanup
    return () => {
      if (tickerInstance && typeof (tickerInstance as any).destroy === "function") {
        try {
          (tickerInstance as any).destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // A komponens nem renderel semmit, csak side-effectet végez.
  return null;
}; 