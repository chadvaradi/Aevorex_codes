# FinanceHub – React SPA Frontend

Ez a mappa tartalmazza a FinanceHub Vite + React alapú egyoldalas alkalmazását.

## Lokális fejlesztés

```bash
# 1. Lépj a frontend mappába
cd modules/financehub/frontend

# 2. Indítsd a Vite dev szervert (8083)
# A root package.json-ben már jelen van a vite és a @vitejs/plugin-react-swc devDependency.
npx vite
```

A dev szerver automatikusan proxyt állít be a `localhost:8084` porton futó FastAPI backendre (lásd `vite.config.ts`).

## Build & kiszolgálás

```bash
# Build -> static/dist
npx vite build

# Egyszerű statikus kiszolgálás (ugyanez szolgálja a legacy HTML-t is)
python3 -m http.server 8083
```

Az elkészült fájlok a `static/dist` mappa gyökerébe kerülnek; az `index.html` automatikusan a helyes hash-elt asseteket fogja hivatkozni a Vite manifest alapján.

## Mappa-struktúra

- `src/` – React komponensek, oldalak
- `index.html` – SPA belépő pont (ne keverd a `financehub.html` legacy nézettel)
- `vite.config.ts` – build/dev konfiguráció
- `static/dist/` – production build kimenet 

## Legacy → React Migration Checklist (2025-06-16)

| Legacy module | Status | Notes |
|---------------|--------|-------|
| Global CSS (`main_financehub.css`) | ✅ Bridged | Imported via `src/index.css` to retain original BEM classes alongside Tailwind. |
| Legacy JS bundle (`main_combined_financehub.js`) | ✅ Bridged | Loaded at runtime through `src/legacy/GlobalAdapter.ts`. |
| Header markup | ✅ Bridged | Rendered in React via `<LegacyHeaderPortal />`. |
| Ticker tape | ⬜ Pending | To be ported using a portal component; requires ticker auto-scroll logic. |
| Stock header | ⬜ Pending | Depends on real-time quote hook integration. |
| TradingView chart | ⬜ Pending | Wrap `UnifiedChartManager` in a React wrapper. |
| Analysis bubbles (4-grid) | ⬜ Pending | Phase-in React versions, disable legacy auto-init gradually. |
| AI Chat panel | ⬜ Pending | Merge legacy styling with current chat implementation, preserve stream logic. |
| Theme manager | ⬜ Pending | Wrap legacy ThemeManager into a React context. |

> Update this table after each migration step to keep visibility on progress. 