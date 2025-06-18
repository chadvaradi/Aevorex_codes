// GlobalAdapter.ts – dynamically loads the legacy JS bundle so the
// window-scoped singletons (FinanceHubAPI, ChartManager, etc.) become
// available inside the React SPA.  We deliberately ignore Vite's module
// pre-bundling so that the script is fetched at runtime only in the
// browser.

// Load the legacy bundle by default – we only skip if the developer
// explicitly sets VITE_SKIP_LEGACY=true when running the dev server.
const meta: any = import.meta;
// Dev-ben soha ne huzza be a legacy bundle-t.  Prod-ban csak akkor, ha NEM kérjük a skip-et.
const isDev = meta.env?.DEV;
const skipLegacy = isDev || meta.env?.VITE_SKIP_LEGACY === 'true' || meta.env?.VITE_NO_LEGACY === 'true';

if (!skipLegacy) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – vite serves from /static during dev and build outputs as well
  import(/* @vite-ignore */ '/static/js/main_combined_financehub.js');
} else {
  // eslint-disable-next-line no-console
  console.debug('[GlobalAdapter] Skipping legacy bundle due to VITE_SKIP_LEGACY');
}

// Placeholder: later we will wrap legacy singletons in React Contexts so
// modern components can access them type-safely. For now, we simply
// assert their presence so TypeScript consumers don't complain.

declare global {
  interface Window {
    FinanceHubAPI?: unknown;
    FinanceHubState?: unknown;
    TradingView?: unknown;
  }
}

export {}; 
export {}; 