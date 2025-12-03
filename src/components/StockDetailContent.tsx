'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  AreaData,
  AreaSeries,
} from 'lightweight-charts';
import { useWatchlist } from '@/hooks/useWatchlist';
import { StockQuote, TimeRange } from '@/types/stock';

interface StockDetailContentProps {
  symbol: string;
  stockName: string;
}

// Chart colors
const CHART_COLORS = {
  background: '#1a1a2e',
  card: '#16213e',
  border: '#0f3460',
  highlight: '#e94560',
  text: '#eaeaea',
  textSecondary: '#a0a0a0',
  success: '#00c853',
  danger: '#ff1744',
};

export default function StockDetailContent({
  symbol,
  stockName,
}: StockDetailContentProps) {
  const router = useRouter();

  const { addToWatchlist, removeFromWatchlist, isInWatchlist, isInitialized } =
    useWatchlist();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  const [stockData, setStockData] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [apiSource, setApiSource] = useState<string>('Yahoo Finance');
  const [mounted, setMounted] = useState(false);

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // ตรวจสอบ watchlist เมื่อ initialized
  useEffect(() => {
    if (isInitialized) {
      setInWatchlist(isInWatchlist(symbol));
    }
  }, [isInitialized, symbol, isInWatchlist]);

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

  // ฟอร์แมตเวลา
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok',
    }).format(date);
  };

  // โหลดข้อมูลหุ้น
  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stock?symbol=${symbol}&type=quote`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const quote = data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error(`ไม่พบข้อมูลหุ้น ${symbol}`);
      }

      const stockQuote: StockQuote = {
        symbol: quote['01. symbol'] || symbol,
        name: stockName,
        price: parseFloat(quote['05. price'] || '0'),
        change: parseFloat(quote['09. change'] || '0'),
        changePercent: parseFloat(
          (quote['10. change percent'] || '0').replace('%', '')
        ),
        volume: parseInt(quote['06. volume'] || '0'),
        high: parseFloat(quote['03. high'] || '0'),
        low: parseFloat(quote['04. low'] || '0'),
        open: parseFloat(quote['02. open'] || '0'),
        previousClose: parseFloat(quote['08. previous close'] || '0'),
        latestTradingDay: quote['07. latest trading day'] || '',
      };

      setStockData(stockQuote);
      setLastUpdate(new Date());
      if (data.source) {
        setApiSource(getProviderName(data.source));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [symbol, stockName]);

  // โหลดข้อมูลกราฟ
  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);

      let type = 'daily';
      if (timeRange === '1D') type = 'intraday';
      else if (timeRange === '1W' || timeRange === '1M') type = 'daily';
      else if (timeRange === '3M' || timeRange === '1Y') type = 'weekly';
      else if (timeRange === 'ALL') type = 'monthly';

      const response = await fetch(`/api/stock?symbol=${symbol}&type=${type}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Parse data based on type
      let timeSeries: Record<string, Record<string, string>>;
      if (type === 'intraday') {
        timeSeries = data['Time Series (5min)'];
      } else if (type === 'daily') {
        timeSeries = data['Time Series (Daily)'];
      } else if (type === 'weekly') {
        timeSeries = data['Weekly Time Series'];
      } else {
        timeSeries = data['Monthly Time Series'];
      }

      if (!timeSeries || Object.keys(timeSeries).length === 0) {
        throw new Error('ไม่มีข้อมูลกราฟ');
      }

      // Convert to chart data
      const chartData: AreaData<Time>[] = Object.entries(timeSeries)
        .map(([date, values]) => {
          // สำหรับ intraday ใช้ timestamp แบบ Unix
          let timeValue: Time;
          if (type === 'intraday') {
            // แปลง datetime string เป็น unix timestamp (seconds)
            const timestamp = Math.floor(new Date(date).getTime() / 1000);
            timeValue = timestamp as Time;
          } else {
            timeValue = date as Time;
          }
          return {
            time: timeValue,
            value: parseFloat(values['4. close'] || '0'),
          };
        })
        .filter((d) => !isNaN(d.value) && d.value > 0)
        .sort((a, b) => {
          if (typeof a.time === 'number' && typeof b.time === 'number') {
            return a.time - b.time;
          }
          return (a.time as string).localeCompare(b.time as string);
        });

      // Filter data based on timeRange
      let filteredData = chartData;
      if (timeRange === '1D') {
        filteredData = chartData.slice(-78); // 5min intervals for one day
      } else if (timeRange === '1W') {
        filteredData = chartData.slice(-7);
      } else if (timeRange === '1M') {
        filteredData = chartData.slice(-30);
      } else if (timeRange === '3M') {
        filteredData = chartData.slice(-13);
      } else if (timeRange === '1Y') {
        filteredData = chartData.slice(-52);
      }

      // Update chart
      if (seriesRef.current && filteredData.length > 0) {
        seriesRef.current.setData(filteredData);
        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      console.error('Chart error:', err);
    } finally {
      setChartLoading(false);
    }
  }, [symbol, timeRange]);

  // สร้างกราฟ - รอให้ mounted ก่อน
  useEffect(() => {
    if (!mounted) return;

    // รอสักครู่ให้ DOM พร้อม
    const timer = setTimeout(() => {
      if (!chartContainerRef.current || chartRef.current) return;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: CHART_COLORS.card },
          textColor: CHART_COLORS.textSecondary,
        },
        grid: {
          vertLines: { color: CHART_COLORS.border },
          horzLines: { color: CHART_COLORS.border },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        crosshair: {
          mode: 1,
        },
        timeScale: {
          borderColor: CHART_COLORS.border,
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: CHART_COLORS.border,
        },
      });

      const series = chart.addSeries(AreaSeries, {
        topColor: `${CHART_COLORS.highlight}80`,
        bottomColor: `${CHART_COLORS.highlight}10`,
        lineColor: CHART_COLORS.highlight,
        lineWidth: 2,
      });

      chartRef.current = chart;
      seriesRef.current = series;
      setChartReady(true);

      // Resize handler
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [mounted]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  // โหลดข้อมูลเมื่อเริ่ม
  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // โหลดกราฟเมื่อ chart พร้อมหรือเปลี่ยน timeRange
  useEffect(() => {
    if (chartReady) {
      fetchChartData();
    }
  }, [chartReady, timeRange, fetchChartData]);

  // จัดการ watchlist
  const toggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(symbol);
      setInWatchlist(false);
    } else {
      addToWatchlist(symbol, stockName);
      setInWatchlist(true);
    }
  };

  const isPositive = stockData ? stockData.change >= 0 : true;
  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-background)] to-[var(--color-secondary)] text-[var(--color-text)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            ← กลับ
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-[var(--color-text)]">
                {symbol}
              </h1>
              <button
                onClick={toggleWatchlist}
                className="p-2 text-[var(--color-highlight)] hover:opacity-70 transition-opacity"
                title={inWatchlist ? 'ลบออกจากรายการ' : 'เพิ่มเข้ารายการ'}
              >
                {inWatchlist ? '🔖' : '📑'}
              </button>
            </div>
            <p className="text-[var(--color-text-secondary)]">{stockName}</p>
          </div>
          <button
            onClick={() => {
              fetchStockData();
              fetchChartData();
            }}
            disabled={loading || chartLoading}
            className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-50 transition-colors"
            title="รีเฟรช"
          >
            <svg
              className={`w-6 h-6 ${loading || chartLoading ? 'spinner' : ''}`}
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

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-[var(--color-danger)]/10 border border-[var(--color-danger)] rounded-xl flex items-center justify-between">
            <span className="text-[var(--color-danger)]">❌ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[var(--color-danger)] hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Price Card */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-[var(--color-border)] rounded w-1/2"></div>
                  <div className="h-6 bg-[var(--color-border)] rounded w-1/3"></div>
                  <hr className="border-[var(--color-border)] my-4" />
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-4 bg-[var(--color-border)] rounded w-1/4"></div>
                        <div className="h-4 bg-[var(--color-border)] rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : stockData ? (
                <>
                  <h2 className="text-4xl font-bold text-[var(--color-text)] mb-2">
                    ${formatNumber(stockData.price)}
                  </h2>
                  <div className="flex items-center gap-2 mb-6">
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
                      className={`text-xl font-semibold ${
                        isPositive
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatNumber(stockData.change)} ({isPositive ? '+' : ''}
                      {formatNumber(stockData.changePercent)}%)
                    </span>
                  </div>

                  <hr className="border-[var(--color-border)] my-4" />

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        เปิด
                      </span>
                      <span className="text-[var(--color-text)] font-medium">
                        ${formatNumber(stockData.open)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        สูงสุด
                      </span>
                      <span className="text-[var(--color-success)] font-medium">
                        ${formatNumber(stockData.high)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        ต่ำสุด
                      </span>
                      <span className="text-[var(--color-danger)] font-medium">
                        ${formatNumber(stockData.low)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        ปิดวันก่อน
                      </span>
                      <span className="text-[var(--color-text)] font-medium">
                        ${formatNumber(stockData.previousClose)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        ปริมาณ
                      </span>
                      <span className="text-[var(--color-text)] font-medium">
                        {formatLargeNumber(stockData.volume)}
                      </span>
                    </div>
                  </div>

                  {/* Last Update */}
                  {lastUpdate && (
                    <div className="mt-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span>🕐</span>
                      <span>อัพเดตล่าสุด: {formatDateTime(lastUpdate)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-[var(--color-border)] rounded w-1/2"></div>
                  <div className="h-6 bg-[var(--color-border)] rounded w-1/3"></div>
                  <hr className="border-[var(--color-border)] my-4" />
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-4 bg-[var(--color-border)] rounded w-1/4"></div>
                        <div className="h-4 bg-[var(--color-border)] rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
              {/* Time Range Selector */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">
                  กราฟราคา
                </h3>
                <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
                  {timeRanges.map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timeRange === range
                          ? 'bg-[var(--color-highlight)] text-white'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Container */}
              <div className="relative" style={{ minHeight: '400px' }}>
                <div
                  ref={chartContainerRef}
                  style={{ width: '100%', height: '400px' }}
                />
                {chartLoading && (
                  <div className="absolute inset-0 flex justify-center items-center bg-black/50 rounded-lg">
                    <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-highlight)] rounded-full spinner" />
                  </div>
                )}
              </div>
            </div>
          </div>
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
