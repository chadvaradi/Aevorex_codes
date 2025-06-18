import { useQuery } from "@tanstack/react-query";

export interface TickerTapeItem {
  symbol: string;
  price: number;
  change_pct: number;
}

export const useTickerTapeData = (limit = 30) => {
  return useQuery<TickerTapeItem[]>({
    queryKey: ["ticker-tape", limit],
    queryFn: async () => {
      const resp = await fetch(`/api/v1/stock/ticker-tape?limit=${limit}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return (json.data ?? []) as TickerTapeItem[];
    },
    staleTime: 60 * 1000, // 1 perc
    refetchInterval: 60 * 1000,
  });
}; 