import { useEffect } from "react";

// Only load the legacy assets in production builds where they are present.
const LEGACY_CSS_HREF = "/static/css/main_combined_financehub.css";
const LEGACY_BUNDLE_SRC = "/static/js/main_combined_financehub.js";

export const LegacyBridge = () => {
  useEffect(() => {
    // Allow developers to opt-out via env flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta: any = import.meta;
    const isDev = meta.env?.DEV ?? meta.env?.MODE === 'development';
    // allow explicit override: if VITE_USE_LEGACY === 'true' we load, unless VITE_SKIP_LEGACY === 'true'
    const envUseLegacy = meta.env?.VITE_USE_LEGACY === 'true';
    const skipLegacy = meta.env?.VITE_SKIP_LEGACY === 'true';
    // Csak akkor használjuk a legacy bundle-t, ha explicit kérik.
    const useLegacy = !skipLegacy && envUseLegacy;
    console.debug('[LegacyBridge] isDev', isDev, 'useLegacy', useLegacy);

    // In dev mode vagy ha nincs explicit VITE_USE_LEGACY flag → ne töltsd a bundle-t
    if (!useLegacy) {
      // Távolítsuk el az esetlegesen korábban beinjektált linket HMR-kor
      const staleLink = document.querySelector(`link[href='${LEGACY_CSS_HREF}']`);
      staleLink?.parentElement?.removeChild(staleLink);
      return;
    }

    // Inject legacy CSS once
    if (!document.querySelector(`link[href='${LEGACY_CSS_HREF}']`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEGACY_CSS_HREF;
      document.head.appendChild(link);
    }

    // Dynamically import the legacy JS bundle so that its side-effects run.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – vite should serve the file from the public /static path
    import(/* @vite-ignore */ LEGACY_BUNDLE_SRC).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to load legacy FinanceHub bundle", err);
    });
  }, []);

  return null;
};

export default LegacyBridge; 