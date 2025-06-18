import React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

// Raw header markup extracted from legacy financehub.html. It still relies on
// the original CSS class names, which are now provided by the legacy CSS
// import added globally in index.css.
const legacyHeaderHtml = `
<header class="fh-header premium-header" id="fh-legacy-header">
  <div class="fh-header__container header-container">
    <div class="fh-header__brand header-brand">
      <div class="fh-header__logo brand-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2L26 8V24L16 30L6 24V8L16 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <path d="M16 10L20 13V19L16 22L12 19V13L16 10Z" fill="currentColor" />
        </svg>
      </div>
      <h1 class="fh-header__title brand-name">FinanceHub</h1>
    </div>
    <div class="fh-header__actions header-controls">
      <form class="header-search header-search-form" style="display:flex;align-items:center;gap:0.25rem;flex-shrink:0;">
        <input type="text" class="search-input tv-symbol-search" placeholder="AAPL" maxlength="12" aria-label="Ticker search" />
        <button type="submit" class="tv-symbol-search-btn" aria-label="Load ticker" title="Load ticker">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2a8 8 0 105.293 14.293l4.147 4.147 1.414-1.414-4.147-4.147A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/></svg>
        </button>
      </form>
      <div id="stock-symbol-display" class="fh-header__stock-display stock-price-display"><span class="fh-header__stock-text">Ready</span></div>
      <button id="theme-toggle" class="fh-header__theme-toggle theme-toggle" aria-label="Toggle theme">
        <!-- icons will be replaced by legacy JS -->
      </button>
    </div>
  </div>
</header>
`;

export const LegacyHeaderPortal = () => {
  useEffect(() => {
    // create container if not present
    let container = document.getElementById("legacy-header-root");
    if (!container) {
      container = document.createElement("div");
      container.id = "legacy-header-root";
      document.body.prepend(container);
    }
  }, []);

  const container = document.getElementById("legacy-header-root");
  if (!container) return null;
  return createPortal(
    <div dangerouslySetInnerHTML={{ __html: legacyHeaderHtml }} />,
    container
  );
}; 