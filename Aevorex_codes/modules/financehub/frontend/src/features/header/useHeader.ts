import React, { useCallback, useEffect, useRef, useState } from "react";

interface SearchResult {
  symbol: string;
  name: string;
}

interface UseHeaderOptions {
  initialSymbol?: string;
}

interface SearchState {
  active: boolean;
  loading: boolean;
  items: SearchResult[];
}

export default function useHeader({ initialSymbol = "AAPL" }: UseHeaderOptions) {
  /* ─────────────────────────────── Refs & State */
  const headerRef = useRef(null as HTMLElement | null);
  const searchInputRef = useRef(null as HTMLInputElement | null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState({ active: false, loading: false, items: [] } as SearchState);

  /* ─────────────────────────────── Scroll handling */
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const scrolled = y > 50;
      setIsScrolled(scrolled);

      // Hide header when scrolling down, show when up
      if (headerRef.current) {
        if (y > lastScrollY && y > 100) {
          headerRef.current.classList.add("header-hidden");
        } else {
          headerRef.current.classList.remove("header-hidden");
        }
      }

      lastScrollY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ─────────────────────────────── Theme sync */
  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
  }, []);

  const toggleTheme = useCallback(() => {
    // Prefer legacy ThemeManager if present
    if ((window as any).ThemeManager && typeof (window as any).ThemeManager.toggleTheme === "function") {
      (window as any).ThemeManager.toggleTheme();
      setIsDark(document.documentElement.classList.contains("dark"));
    } else {
      const html = document.documentElement;
      html.classList.toggle("dark");
      setIsDark(html.classList.contains("dark"));
    }
  }, []);

  /* ─────────────────────────────── Mobile menu */
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  /* ─────────────────────────────── Search */
  // Debounce helper
  const debounce = (fn: (...args: any[]) => void, delay = 300) => {
    let t: ReturnType<typeof setTimeout> | undefined;
    return (...args: any[]) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const performSearch = async (query: string) => {
    if (!query) {
      setSearch({ active: false, loading: false, items: [] });
      return;
    }

    setSearch({ active: true, loading: true, items: [] });
    try {
      const res = await fetch(`/api/v1/stock/search?q=${encodeURIComponent(query)}`);
      const data: SearchResult[] = await res.json();
      setSearch({ active: true, loading: false, items: data.slice(0, 10) });
    } catch (err) {
      console.error("Search error", err);
      setSearch({ active: true, loading: false, items: [] });
    }
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const debouncedSearch = useRef(debounce(performSearch, 300));

  // Using 'any' to avoid TS namespace mismatch in legacy project config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSearchInput = (e: any) => {
    const val = e.target.value.trim();
    debouncedSearch.current(val);
  };

  const selectResult = (result: SearchResult) => {
    // Update input value
    if (searchInputRef.current) {
      searchInputRef.current.value = result.symbol;
    }
    setSearch({ active: false, loading: false, items: [] });

    // Navigate or emit custom event for ticker change
    (window as any).AppState?.set("currentSymbol", result.symbol);
    // Optionally dispatch a custom event for React router/state
    window.dispatchEvent(new CustomEvent("financehub:ticker-change", { detail: { symbol: result.symbol } }));
  };

  /* ─────────────────────────────── Return API */
  return {
    isScrolled,
    headerRef,
    searchInputRef,
    searchResults: search,
    handleSearchInput,
    selectResult,
    toggleTheme,
    isDark,
    mobileMenuOpen,
    toggleMobileMenu,
  } as const;
} 