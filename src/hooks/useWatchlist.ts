'use client';

import { useState, useEffect, useCallback } from 'react';
import { WatchlistItem, StockQuote } from '@/types/stock';

const WATCHLIST_KEY = 'stock_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<
    Map<string, StockQuote>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // โหลด watchlist จาก localStorage เมื่อ mount
  useEffect(() => {
    const saved = localStorage.getItem(WATCHLIST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWatchlist(parsed);
      } catch {
        console.error('Failed to parse watchlist from localStorage');
      }
    }
    setIsInitialized(true);
  }, []);

  // บันทึก watchlist ลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist, isInitialized]);

  // เพิ่มหุ้นเข้า watchlist
  const addToWatchlist = useCallback((symbol: string, name: string) => {
    setWatchlist((prev) => {
      // ตรวจสอบว่ามีอยู่แล้วหรือไม่
      if (prev.some((item) => item.symbol === symbol)) {
        return prev;
      }
      return [
        ...prev,
        {
          symbol,
          name,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  // ลบหุ้นออกจาก watchlist
  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    setWatchlistQuotes((prev) => {
      const newMap = new Map(prev);
      newMap.delete(symbol);
      return newMap;
    });
  }, []);

  // ตรวจสอบว่าหุ้นอยู่ใน watchlist หรือไม่
  const isInWatchlist = useCallback(
    (symbol: string) => {
      return watchlist.some((item) => item.symbol === symbol);
    },
    [watchlist]
  );

  // ดึงข้อมูลราคาหุ้นใน watchlist ทั้งหมด
  const refreshWatchlistQuotes = useCallback(async () => {
    if (watchlist.length === 0) return;

    setLoading(true);
    const newQuotes = new Map<string, StockQuote>();

    // ดึงข้อมูลทีละตัวเพื่อไม่ให้โดน rate limit
    for (const item of watchlist) {
      try {
        const response = await fetch(
          `/api/stock?symbol=${item.symbol}&type=quote`
        );
        const data = await response.json();

        if (data['Global Quote']) {
          const quote = data['Global Quote'];
          newQuotes.set(item.symbol, {
            symbol: quote['01. symbol'],
            name: item.name,
            price: parseFloat(quote['05. price']) || 0,
            change: parseFloat(quote['09. change']) || 0,
            changePercent:
              parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
            open: parseFloat(quote['02. open']) || 0,
            high: parseFloat(quote['03. high']) || 0,
            low: parseFloat(quote['04. low']) || 0,
            volume: parseInt(quote['06. volume']) || 0,
            previousClose: parseFloat(quote['08. previous close']) || 0,
            latestTradingDay: quote['07. latest trading day'] || '',
          });
        }

        // รอ 1 วินาทีระหว่างแต่ละ request เพื่อไม่ให้โดน rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to fetch quote for ${item.symbol}:`, error);
      }
    }

    setWatchlistQuotes(newQuotes);
    setLoading(false);
  }, [watchlist]);

  return {
    watchlist,
    watchlistQuotes,
    loading,
    isInitialized,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    refreshWatchlistQuotes,
  };
}
