import React from "react";
import useHeader from "./useHeader";

interface HeaderProps {
  initialSymbol?: string;
}

/**
 * FinanceHub Premium Header
 * – Fixed top bar with logo, search, theme toggle and mobile menu.
 * – Animates on scroll (compact vs full) and hides on downward scroll.
 */
export default function Header({ initialSymbol = "AAPL" }: HeaderProps) {
  const {
    isScrolled,
    headerRef,
    searchInputRef,
    searchResults,
    handleSearchInput,
    selectResult,
    toggleTheme,
    isDark,
    mobileMenuOpen,
    toggleMobileMenu,
  } = useHeader({ initialSymbol });

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 z-50 w-full bg-background/80 backdrop-blur border-b border-border transition-all duration-300 ${isScrolled ? "scrolled shadow-sm" : ""}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="#" className="logo text-xl font-semibold tracking-wide">Aevorex FinanceHub</a>

        {/* Desktop nav scaffold (future) */}
        <nav className="hidden lg:flex gap-6 nav">
          {/* TODO: nav items */}
        </nav>

        {/* Search */}
        <div className="relative w-64">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search ticker..."
            className="search-input w-full bg-muted px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onChange={handleSearchInput}
          />
          {searchResults.active && (
            <div className="absolute left-0 right-0 mt-1 bg-popover rounded shadow-lg max-h-64 overflow-y-auto search-results">
              {searchResults.loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
              ) : searchResults.items.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No results</div>
              ) : (
                searchResults.items.map((r, idx) => (
                  <div
                    key={r.symbol}
                    className="search-result-item cursor-pointer px-3 py-2 hover:bg-accent transition-colors"
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => selectResult(r)}
                  >
                    <span className="font-medium mr-2">{r.symbol}</span>
                    <span className="text-xs text-muted-foreground">{r.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <button
            aria-label="Toggle theme"
            className="theme-toggle p-2 rounded hover:bg-accent/50"
            onClick={toggleTheme}
          >
            {isDark ? (
              <i className="fas fa-sun" />
            ) : (
              <i className="fas fa-moon" />
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden mobile-menu-toggle p-2 rounded hover:bg-accent/50"
            onClick={toggleMobileMenu}
          >
            <i className="fas fa-bars" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu lg:hidden bg-background border-t border-border">
          <div className="flex flex-col p-4 gap-3">
            {/* TODO: mobile nav items */}
          </div>
        </div>
      )}
    </header>
  );
} 