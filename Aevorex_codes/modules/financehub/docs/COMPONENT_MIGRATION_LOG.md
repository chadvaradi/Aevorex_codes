# FinanceHub – Frontend Komponens Migrációs Napló

*Frissítve:* 2025-06-16

Ez a fájl szolgál a statikus → React + Vite SPA átültetés státuszának nyomon követésére. **Minden komponensnél** jelöljük a legutóbbi állapotot, hogy elkerüljük a duplikált munkát és lássuk a hátralévő feladatokat.

| # | Legacy modul / JS / CSS | Új React modul (src/) | Átültetés állapota | Utolsó frissítés | Megjegyzés |
|---|-------------------------|-----------------------|-------------------|------------------|------------|
| 1 | `static/js/components/chat/*` + `chat` bubble CSS | `src/components/chat/ChatPanel.*` | ✅ **Ported & verified** | 2025-06-15 | SSE-streaming működik. |
| 2 | `static/js/ui/header-ui.js` + `header` CSS | `src/features/header/Header.view.tsx` | ⏳ **WIP – React refactor** | 2025-06-16 | useHeader hook + Header.view.tsx kész; LegacyBridge header-init kikapcsolható. |
| 3 | `static/js/components/ticker-tape/*` | tervezett: `src/features/ticker/TickerTape.view.tsx` | ☑️ **Bridged via Legacy** | 2025-06-16 | React Portal (`LegacyTickerTapePortal`) + TickerTapeUnified.init(). |
| 4 | `static/js/components/stock-header/*` | tervezett: `src/features/stock-header/StockHeader.view.tsx` | ❌ **Pending** | – | GET `/api/v1/stock/header/{ticker}` |
| 5 | TradingView Chart (`chart.js`) | `src/features/chart/TradingViewChart.view.tsx` | ☑️ **Bridged via Legacy** | 2025-06-16 | React Portal (`LegacyChartPortal`) relies on UnifiedChartManager auto-init. |
| 6 | Analysis Bubbles (Company Overview, Financial Metrics, Technical Analysis, News Highlights) | `src/features/bubbles/*` | ❌ **Pending** | – | Négy almappa. |
| 7 | Footer (`footer.js`) | `src/features/footer/Footer.view.tsx` | ❌ **Pending** | – | -- |
| 8 | ThemeManager (`theme-manager.js`) | `src/core/theme/useTheme.ts` | ☑️ **Bridged via Legacy** | 2025-06-14 | Végleges React-hook refaktor hátra van. |
| 9 | Global CSS (`static/css/main_financehub.css`) | – (globálisan @importálva) | ☑️ **Bridged via Legacy** | 2025-06-16 | Betöltve `src/index.css` @importtal; Tailwind mellett él. |
| 10 | Legacy JS bundle (`static/js/main_combined_financehub.js`) | – (Runtime import) | ☑️ **Bridged via Legacy** | 2025-06-16 | Dinamikus import `src/legacy/GlobalAdapter.ts`; window-scope singletonok elérhetők. |

**Jelmagyarázat**

- ✅ Ported & verified – React komponens kész, legacy inicializáció kikapcsolva, Lighthouse vizuális parity oké.
- ☑️ Bridged via Legacy – Még a LegacyBridge tölti be, de React-SPA-val kompatibilis, refaktor később.
- ⏳ WIP – Aktív fejlesztés alatt.
- ❌ Pending – Még teljesen legacy.

> Ha új komponenst portolsz vagy a státusz változik, **minden commitban** frissítsd ezt a táblázatot, hogy a csapat mindig lássa az aktuális helyzetet. 