'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';
import { SearchResult } from '@/types/stock';

export default function DashboardContent() {
  const router = useRouter();
  const {
    watchlist,
    watchlistQuotes,
    loading: watchlistLoading,
    isInitialized,
    removeFromWatchlist,
    refreshWatchlistQuotes,
  } = useWatchlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [apiSource, setApiSource] = useState<string>('Yahoo Finance');

  // แปลงชื่อ API source
  const getProviderName = (source: string) => {
    switch (source) {
      case 'yahoo':
        return 'Yahoo Finance';
      case 'finnhub':
        return 'Finnhub';
      case 'twelvedata':
        return 'Twelve Data';
      default:
        return 'Yahoo Finance';
    }
  };

  // ฟอร์แมตตัวเลข
  const formatNumber = (num: number, decimals = 2) => {
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // ฟอร์แมตตัวเลขใหญ่
  const formatLargeNumber = (num: number) => {
    if (isNaN(num)) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
  };

  // โหลดข้อมูล watchlist เมื่อเริ่มต้น
  useEffect(() => {
    if (isInitialized && watchlist.length > 0) {
      refreshWatchlistQuotes();
    }
  }, [isInitialized, watchlist.length, refreshWatchlistQuotes]);

  // ค้นหาหุ้น
  const searchStock = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setError(null);
    setShowSearchResults(true);

    try {
      const response = await fetch(
        `/api/stock?symbol=${encodeURIComponent(query)}&type=search`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setSearchResults([]);
        return;
      }

      if (data.bestMatches && data.bestMatches.length > 0) {
        const results: SearchResult[] = data.bestMatches.map(
          (match: Record<string, string>) => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region'],
            currency: match['8. currency'],
          })
        );
        setSearchResults(results);
        if (data.source) {
          setApiSource(getProviderName(data.source));
        }
      } else {
        setSearchResults([]);
        setError(`ไม่พบหุ้น "${query}"`);
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการค้นหา');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        searchStock(query);
      }, 400);
    },
    [searchStock]
  );

  // กด Enter ค้นหา
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchStock(searchQuery);
    }
  };

  // ไปหน้ารายละเอียดหุ้น
  const goToStockDetail = (symbol: string, name: string) => {
    router.push(`/stock/${symbol}?name=${encodeURIComponent(name)}`);
  };

  // เลือกหุ้นจากผลการค้นหา
  const handleSelectStock = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');
    goToStockDetail(result.symbol, result.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-background)] to-[var(--color-secondary)] text-[var(--color-text)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--color-highlight)] to-pink-400 bg-clip-text text-transparent mb-2">
            📈 Stock Dashboard
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            ค้นหาและติดตามหุ้นที่คุณสนใจ
          </p>
        </div>

        {/* Search Box */}
        <div className="relative mb-6">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                🔍
              </span>
              <input
                type="text"
                placeholder="ค้นหาหุ้น เช่น AAPL, GOOGL, MSFT, TSLA..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-lg py-3 pl-12 pr-12 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-highlight)] transition-colors"
              />
              {searchLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-highlight)] rounded-full spinner" />
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl max-h-80 overflow-auto z-50 shadow-xl">
                {searchResults.map((result, index) => (
                  <div
                    key={result.symbol}
                    onClick={() => handleSelectStock(result)}
                    className={`px-4 py-3 cursor-pointer hover:bg-[var(--color-accent)] transition-colors ${
                      index < searchResults.length - 1
                        ? 'border-b border-[var(--color-border)]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-text)]">
                        {result.symbol}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--color-accent)] rounded text-[var(--color-text-secondary)]">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                      {result.name} • {result.region} • {result.currency}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)] rounded-xl flex items-center justify-between">
            <span className="text-[var(--color-warning)]">⚠️ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-warning)] hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        {/* Watchlist Section */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <span className="text-[var(--color-highlight)] text-xl">🔖</span>
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                รายการหุ้นที่สนใจ
              </h2>
              <span className="px-2 py-1 bg-[var(--color-accent)] rounded-full text-sm">
                {watchlist.length}
              </span>
            </div>
            <button
              onClick={refreshWatchlistQuotes}
              disabled={watchlistLoading || watchlist.length === 0}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-50 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <svg
                className={`w-5 h-5 ${watchlistLoading ? 'spinner' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* Watchlist Table */}
          {watchlist.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                      หุ้น
                    </th>
                    <th className="text-right py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                      ราคา
                    </th>
                    <th className="text-right py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                      เปลี่ยนแปลง
                    </th>
                    <th className="text-right py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                      ปริมาณ
                    </th>
                    <th className="text-center py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((item) => {
                    const quote = watchlistQuotes.get(item.symbol);
                    const isPositive = quote ? quote.change >= 0 : true;

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => goToStockDetail(item.symbol, item.name)}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)] cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-semibold text-[var(--color-text)]">
                            {item.symbol}
                          </div>
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            {item.name}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {watchlistLoading && !quote ? (
                            <div className="h-5 w-16 bg-[var(--color-border)] rounded animate-pulse ml-auto" />
                          ) : quote ? (
                            <span className="font-semibold font-mono">
                              ${formatNumber(quote.price)}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-secondary)]">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {watchlistLoading && !quote ? (
                            <div className="h-5 w-20 bg-[var(--color-border)] rounded animate-pulse ml-auto" />
                          ) : quote ? (
                            <div className="flex items-center justify-end gap-1">
                              <span
                                className={
                                  isPositive
                                    ? 'text-[var(--color-success)]'
                                    : 'text-[var(--color-danger)]'
                                }
                              >
                                {isPositive ? '↗' : '↘'}
                              </span>
                              <span
                                className={`font-semibold ${
                                  isPositive
                                    ? 'text-[var(--color-success)]'
                                    : 'text-[var(--color-danger)]'
                                }`}
                              >
                                {isPositive ? '+' : ''}
                                {formatNumber(quote.changePercent)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--color-text-secondary)]">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-[var(--color-text-secondary)]">
                          {watchlistLoading && !quote ? (
                            <div className="h-5 w-12 bg-[var(--color-border)] rounded animate-pulse ml-auto" />
                          ) : quote ? (
                            formatLargeNumber(quote.volume)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                goToStockDetail(item.symbol, item.name);
                              }}
                              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                              title="ดูรายละเอียด"
                            >
                              👁
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromWatchlist(item.symbol);
                              }}
                              className="p-2 text-[var(--color-danger)] hover:opacity-70 transition-opacity"
                              title="ลบออกจากลิสต์"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              <div className="text-5xl mb-4 opacity-50">🔖</div>
              <h3 className="text-lg font-medium mb-2">
                ยังไม่มีหุ้นในรายการที่สนใจ
              </h3>
              <p className="text-sm">
                ค้นหาหุ้นและเพิ่มเข้ารายการเพื่อติดตามราคา
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            ข้อมูลจาก {apiSource} • Stock Dashboard © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
