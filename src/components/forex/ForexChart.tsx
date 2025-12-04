'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickSeries,
  CandlestickData,
} from 'lightweight-charts';
import {
  Box,
  CircularProgress,
  Typography,
  ButtonGroup,
  Button,
  Chip,
} from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { ForexTimeRange, FOREX_COLORS } from '@/types/forex';

interface ForexChartProps {
  symbol: string;
  height?: number;
  onPriceUpdate?: (price: number, change: number) => void;
}

export default function ForexChart({
  symbol,
  height = 500,
  onPriceUpdate,
}: ForexChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<ForexTimeRange>('5m');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number>(60);

  // ดึงข้อมูลกราฟ
  const fetchChartData = useCallback(
    async (showLoading = true) => {
      if (!symbol) return;

      if (showLoading) setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/forex?action=timeseries&symbol=${encodeURIComponent(
            symbol
          )}&interval=${timeRange}&t=${Date.now()}`
        );

        if (!response.ok) throw new Error('Failed to fetch chart data');

        const result = await response.json();
        const data = result.data || [];

        if (seriesRef.current && data.length > 0) {
          const chartData: CandlestickData<Time>[] = data.map(
            (d: {
              time: string;
              open: number;
              high: number;
              low: number;
              close: number;
            }) => ({
              time: (new Date(d.time).getTime() / 1000) as Time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            })
          );

          seriesRef.current.setData(chartData);
          chartRef.current?.timeScale().fitContent();

          // อัพเดทราคาปัจจุบัน
          const lastCandle = chartData[chartData.length - 1];
          if (lastCandle && chartData.length > 1) {
            const prevCandle = chartData[chartData.length - 2];
            const change = lastCandle.close - prevCandle.close;
            onPriceUpdate?.(lastCandle.close, change);
          }

          setLastUpdate(new Date());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [symbol, timeRange, onPriceUpdate]
  );

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#0f0f1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#758696',
          width: 1,
          style: 2,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 2,
          labelBackgroundColor: '#2a2e39',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 10,
      },
    });

    chartRef.current = chart;

    // สร้าง Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    seriesRef.current = candlestickSeries;

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
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [height]);

  // Fetch data when symbol or timeRange changes
  useEffect(() => {
    fetchChartData(true);
  }, [symbol, timeRange]);

  // Auto update ทุก 1 นาที (ตอน :00)
  useEffect(() => {
    // คำนวณเวลาที่เหลือจนถึง :00 ถัดไป
    const calculateSecondsUntilNextMinute = () => {
      const now = new Date();
      return 60 - now.getSeconds();
    };

    setNextUpdate(calculateSecondsUntilNextMinute());

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setNextUpdate((prev) => {
        if (prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    // รอจนถึง :00 ก่อน แล้วค่อย set interval ทุกนาที
    const secondsUntilNextMinute = calculateSecondsUntilNextMinute();

    let updateInterval: NodeJS.Timeout;

    const initialTimeout = setTimeout(() => {
      // Fetch ตอน :00
      fetchChartData(false);

      // หลังจากนั้น fetch ทุก 1 นาที
      updateInterval = setInterval(() => {
        fetchChartData(false);
      }, 60000);
    }, secondsUntilNextMinute * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(countdownInterval);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [symbol, timeRange, fetchChartData]);

  const timeRanges: { value: ForexTimeRange; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '1d', label: '1d' },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Time Range Buttons */}
        <ButtonGroup size="small" variant="outlined">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              sx={{
                color: timeRange === range.value ? '#26a69a' : '#758696',
                borderColor: 'rgba(42, 46, 57, 0.8)',
                bgcolor:
                  timeRange === range.value
                    ? 'rgba(38, 166, 154, 0.1)'
                    : 'transparent',
                fontWeight: timeRange === range.value ? 700 : 400,
                '&:hover': {
                  bgcolor: 'rgba(38, 166, 154, 0.2)',
                  borderColor: 'rgba(42, 46, 57, 0.8)',
                },
              }}
            >
              {range.label}
            </Button>
          ))}
        </ButtonGroup>

        {/* Update Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastUpdate && (
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
              label={`อัพเดท: ${formatTime(lastUpdate)}`}
              size="small"
              sx={{
                bgcolor: 'rgba(42, 46, 57, 0.8)',
                color: '#758696',
                fontSize: '0.75rem',
              }}
            />
          )}
          <Chip
            label={`ถัดไป: ${nextUpdate}s`}
            size="small"
            sx={{
              bgcolor:
                nextUpdate <= 10
                  ? 'rgba(239, 83, 80, 0.2)'
                  : 'rgba(38, 166, 154, 0.2)',
              color: nextUpdate <= 10 ? '#ef5350' : '#26a69a',
              fontSize: '0.75rem',
              fontWeight: 600,
              minWidth: 80,
            }}
          />
        </Box>
      </Box>

      {/* Chart Container */}
      <Box
        ref={chartContainerRef}
        sx={{
          width: '100%',
          height: height,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#0f0f1a',
          border: '1px solid rgba(42, 46, 57, 0.8)',
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={40} sx={{ color: '#26a69a' }} />
          <Typography sx={{ color: '#758696', fontSize: '0.875rem' }}>
            กำลังโหลดข้อมูล...
          </Typography>
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ color: '#ef5350', mb: 1 }}>{error}</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => fetchChartData(true)}
            sx={{ color: '#26a69a', borderColor: '#26a69a' }}
          >
            ลองใหม่
          </Button>
        </Box>
      )}
    </Box>
  );
}
