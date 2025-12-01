'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Grid,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  CandlestickSeries,
} from 'lightweight-charts';

// Asset configurations
const ASSET_CONFIG: Record<
  string,
  { name: string; fullName: string; basePrice: number; icon: string }
> = {
  XAUUSD: {
    name: 'XAUUSD',
    fullName: 'Gold Spot / US Dollar',
    basePrice: 2650,
    icon: '✦',
  },
  TSLA: {
    name: 'TSLA',
    fullName: 'Tesla Inc.',
    basePrice: 350,
    icon: '⚡',
  },
  AAPL: {
    name: 'AAPL',
    fullName: 'Apple Inc.',
    basePrice: 190,
    icon: '🍎',
  },
  BTCUSD: {
    name: 'BTCUSD',
    fullName: 'Bitcoin / US Dollar',
    basePrice: 95000,
    icon: '₿',
  },
  EURUSD: {
    name: 'EURUSD',
    fullName: 'Euro / US Dollar',
    basePrice: 1.05,
    icon: '€',
  },
  USDJPY: {
    name: 'USDJPY',
    fullName: 'US Dollar / Japanese Yen',
    basePrice: 150,
    icon: '¥',
  },
};

// Timeframe configurations
const TIMEFRAME_CONFIG: Record<
  string,
  { interval: number; count: number; label: string }
> = {
  '1M': { interval: 60, count: 60, label: '1 นาที' }, // 1 hour of 1-min candles
  '5M': { interval: 300, count: 72, label: '5 นาที' }, // 6 hours of 5-min candles
  '15M': { interval: 900, count: 96, label: '15 นาที' }, // 24 hours of 15-min candles
  '1H': { interval: 3600, count: 168, label: '1 ชั่วโมง' }, // 7 days of 1-hour candles
  '4H': { interval: 14400, count: 180, label: '4 ชั่วโมง' }, // 30 days of 4-hour candles
  '1D': { interval: 86400, count: 365, label: '1 วัน' }, // 1 year of daily candles
};

// Date range configurations
const DATE_RANGE_CONFIG: Record<string, { days: number; label: string }> = {
  '1D': { days: 1, label: '1 วัน' },
  '1W': { days: 7, label: '1 สัปดาห์' },
  '1M': { days: 30, label: '1 เดือน' },
  '3M': { days: 90, label: '3 เดือน' },
  '6M': { days: 180, label: '6 เดือน' },
  '1Y': { days: 365, label: '1 ปี' },
  ALL: { days: 730, label: 'ทั้งหมด' },
};

// สร้างข้อมูลจำลองราคาทองตาม timeframe และ date range
const generateHistoricalData = (
  timeframeKey: string,
  dateRangeKey: string,
  assetKey: string
): CandlestickData<Time>[] => {
  const data: CandlestickData<Time>[] = [];
  const config = TIMEFRAME_CONFIG[timeframeKey];
  const dateRange = DATE_RANGE_CONFIG[dateRangeKey];
  const asset = ASSET_CONFIG[assetKey];

  // คำนวณจำนวน candles ที่ต้องสร้าง
  const totalSeconds = dateRange.days * 86400;
  const candleCount = Math.min(Math.floor(totalSeconds / config.interval), 500);

  // ปรับ volatility ตามประเภทสินทรัพย์
  const volatilityFactor =
    assetKey === 'BTCUSD'
      ? 3
      : assetKey === 'EURUSD' || assetKey === 'USDJPY'
      ? 0.1
      : 1;
  let basePrice = asset.basePrice * (0.9 + Math.random() * 0.2); // ราคาเริ่มต้นสุ่ม ±10%
  const now = Math.floor(Date.now() / 1000);

  // สร้าง trend pattern
  const trendDirection = Math.random() > 0.5 ? 1 : -1;
  const trendStrength = Math.random() * 0.5;

  for (let i = candleCount; i >= 0; i--) {
    const time = (now - i * config.interval) as Time;

    // เพิ่ม volatility ตาม timeframe และประเภทสินทรัพย์
    const volatilityMultiplier = config.interval / 60; // ยิ่ง timeframe ใหญ่ ยิ่ง volatile
    const volatility =
      (Math.random() - 0.5) *
      Math.sqrt(volatilityMultiplier) *
      5 *
      volatilityFactor;

    // เพิ่ม trend
    const trendEffect =
      ((trendDirection * trendStrength * (candleCount - i)) / candleCount) *
      50 *
      volatilityFactor;

    const open = basePrice + volatility + trendEffect;
    const range =
      Math.random() * Math.sqrt(volatilityMultiplier) * 10 * volatilityFactor;
    const high = open + range;
    const low = open - range;
    const close = low + Math.random() * (high - low);

    data.push({ time, open, high, low, close });
    basePrice = close;
  }

  return data;
};

// สร้างข้อมูลใหม่แบบ real-time
const generateNewCandle = (
  lastClose: number,
  interval: number,
  assetKey: string
): CandlestickData<Time> => {
  const time = Math.floor(Date.now() / 1000) as Time;
  const volatilityFactor =
    assetKey === 'BTCUSD'
      ? 3
      : assetKey === 'EURUSD' || assetKey === 'USDJPY'
      ? 0.1
      : 1;
  const volatilityMultiplier = interval / 60;
  const volatility =
    (Math.random() - 0.5) *
    Math.sqrt(volatilityMultiplier) *
    3 *
    volatilityFactor;
  const open = lastClose + volatility;
  const range =
    Math.random() * Math.sqrt(volatilityMultiplier) * 5 * volatilityFactor;
  const high = open + range;
  const low = open - range;
  const close = low + Math.random() * (high - low);

  return { time, open, high, low, close };
};

export default function Home() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [currentPrice, setCurrentPrice] = useState(0);
  const [previousClose, setPreviousClose] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [highPrice, setHighPrice] = useState(0);
  const [lowPrice, setLowPrice] = useState(0);
  const [openPrice, setOpenPrice] = useState(0);
  const [timeframe, setTimeframe] = useState('1H');
  const [dateRange, setDateRange] = useState('1W');
  const [selectedAsset, setSelectedAsset] = useState('XAUUSD');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // ตรวจสอบว่า component mount แล้ว (client-side only)
  useEffect(() => {
    setIsMounted(true);
    setLastUpdate(new Date());
  }, []);

  // โหลดข้อมูลใหม่เมื่อเปลี่ยน timeframe หรือ date range หรือ asset
  const loadChartData = useCallback(() => {
    if (!isMounted) return [];
    const data = generateHistoricalData(timeframe, dateRange, selectedAsset);

    if (data.length > 0) {
      const lastCandle = data[data.length - 1];
      const firstCandle = data[0];

      setCurrentPrice(lastCandle.close);
      setOpenPrice(firstCandle.open);
      setPreviousClose(
        data.length > 1 ? data[data.length - 2].close : firstCandle.open
      );
      setPriceChange(lastCandle.close - firstCandle.open);
      setPriceChangePercent(
        ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
      );

      const highs = data.map((d) => d.high);
      const lows = data.map((d) => d.low);
      setHighPrice(Math.max(...highs));
      setLowPrice(Math.min(...lows));
    }

    return data;
  }, [timeframe, dateRange, selectedAsset, isMounted]);

  const handleTimeframeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newTimeframe: string | null) => {
      if (newTimeframe !== null) {
        setTimeframe(newTimeframe);
      }
    },
    []
  );

  const handleDateRangeChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      setDateRange(newValue);
    },
    []
  );

  const handleAssetChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      if (newValue !== null) {
        setSelectedAsset(newValue);
      }
    },
    []
  );

  // สร้าง Chart
  useEffect(() => {
    if (!chartContainerRef.current || !isMounted) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#FFF8DE' },
        textColor: '#5a5a5a',
      },
      grid: {
        vertLines: { color: '#e8e0c8' },
        horzLines: { color: '#e8e0c8' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e8e0c8',
      },
      rightPriceScale: {
        borderColor: '#e8e0c8',
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return date.toLocaleTimeString('th-TH', {
            timeZone: 'Asia/Bangkok',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#8CA9FF',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#8CA9FF',
          width: 1,
          style: 2,
        },
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#8CA9FF',
      downColor: '#E8A87C',
      borderVisible: false,
      wickUpColor: '#8CA9FF',
      wickDownColor: '#E8A87C',
    });

    seriesRef.current = candlestickSeries;

    // โหลดข้อมูลเริ่มต้นทันที
    const initialData = generateHistoricalData('1H', '1W', 'XAUUSD');
    if (initialData.length > 0) {
      candlestickSeries.setData(initialData);
      chart.timeScale().fitContent();

      const lastCandle = initialData[initialData.length - 1];
      const firstCandle = initialData[0];
      setCurrentPrice(lastCandle.close);
      setOpenPrice(firstCandle.open);
      setPreviousClose(
        initialData.length > 1
          ? initialData[initialData.length - 2].close
          : firstCandle.open
      );
      setPriceChange(lastCandle.close - firstCandle.open);
      setPriceChangePercent(
        ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
      );

      const highs = initialData.map((d) => d.high);
      const lows = initialData.map((d) => d.low);
      setHighPrice(Math.max(...highs));
      setLowPrice(Math.min(...lows));
    }

    setIsChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isMounted]);

  // อัพเดทข้อมูลกราฟเมื่อ timeframe หรือ dateRange หรือ asset เปลี่ยน
  useEffect(() => {
    if (!isChartReady || !seriesRef.current || !chartRef.current || !isMounted)
      return;

    const data = loadChartData();

    if (data.length > 0) {
      seriesRef.current.setData(data);
      chartRef.current.timeScale().fitContent();
    }
  }, [
    timeframe,
    dateRange,
    selectedAsset,
    loadChartData,
    isChartReady,
    isMounted,
  ]);

  // Real-time update
  useEffect(() => {
    if (!isChartReady || !isMounted) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const config = TIMEFRAME_CONFIG[timeframe];
    // อัพเดทถี่ขึ้นสำหรับ timeframe เล็ก
    const updateInterval = Math.min(config.interval * 100, 3000); // max 3 seconds

    let lastClose = currentPrice;

    intervalRef.current = setInterval(() => {
      if (seriesRef.current) {
        const newCandle = generateNewCandle(
          lastClose,
          config.interval,
          selectedAsset
        );
        seriesRef.current.update(newCandle);

        lastClose = newCandle.close;
        setCurrentPrice(newCandle.close);
        setPriceChange(newCandle.close - openPrice);
        setPriceChangePercent(
          ((newCandle.close - openPrice) / openPrice) * 100
        );
        setLastUpdate(new Date());

        if (newCandle.high > highPrice) setHighPrice(newCandle.high);
        if (newCandle.low < lowPrice) setLowPrice(newCandle.low);
      }
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    timeframe,
    openPrice,
    highPrice,
    lowPrice,
    currentPrice,
    isChartReady,
    selectedAsset,
    isMounted,
  ]);

  const isPositive = priceChange >= 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FFF2C6 0%, #FFF8DE 100%)',
        color: '#333',
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8CA9FF 0%, #AAC4F5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: '#fff',
            }}
          >
            {ASSET_CONFIG[selectedAsset].icon}
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, letterSpacing: 0.5, color: '#333' }}
            >
              {ASSET_CONFIG[selectedAsset].name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#888', fontSize: '0.85rem' }}
            >
              {ASSET_CONFIG[selectedAsset].fullName}
            </Typography>
          </Box>
          <Chip
            label="● LIVE"
            size="small"
            sx={{
              ml: 'auto',
              backgroundColor: 'rgba(140, 169, 255, 0.2)',
              color: '#8CA9FF',
              fontWeight: 600,
              fontSize: '0.7rem',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 },
              },
            }}
          />
        </Box>
      </Box>

      {/* Asset Selector */}
      <Paper
        sx={{
          background: '#ffffff',
          borderRadius: 3,
          mb: 3,
          border: '1px solid #AAC4F5',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderBottom: '1px solid #eee',
          }}
        >
          <ShowChartIcon sx={{ color: '#8CA9FF', mr: 1, fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
            เลือกสินทรัพย์
          </Typography>
        </Box>
        <Tabs
          value={selectedAsset}
          onChange={handleAssetChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              minWidth: 80,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#888',
              '&.Mui-selected': {
                color: '#8CA9FF',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#8CA9FF',
            },
          }}
        >
          {Object.entries(ASSET_CONFIG).map(([key, asset]) => (
            <Tab
              key={key}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{asset.icon}</span>
                  <span>{asset.name}</span>
                </Box>
              }
              value={key}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Price Display */}
      <Paper
        sx={{
          background: '#ffffff',
          borderRadius: 4,
          p: 3,
          mb: 3,
          border: '1px solid #AAC4F5',
          boxShadow: '0 4px 20px rgba(140, 169, 255, 0.15)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontFamily: '"SF Mono", "Roboto Mono", monospace',
              color: '#333',
              letterSpacing: '-1px',
            }}
          >
            {isMounted ? `$${currentPrice.toFixed(2)}` : '$---.--'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            {isPositive ? (
              <TrendingUpIcon sx={{ color: '#8CA9FF', fontSize: 28 }} />
            ) : (
              <TrendingDownIcon sx={{ color: '#E8A87C', fontSize: 28 }} />
            )}
            <Typography
              variant="h6"
              sx={{
                color: isPositive ? '#8CA9FF' : '#E8A87C',
                fontWeight: 600,
                fontFamily: '"SF Mono", "Roboto Mono", monospace',
              }}
            >
              {isMounted ? (
                <>
                  {isPositive ? '+' : ''}
                  {priceChange.toFixed(2)} ({isPositive ? '+' : ''}
                  {priceChangePercent.toFixed(2)}%)
                </>
              ) : (
                '--'
              )}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: '#999', fontSize: 16 }} />
            <Typography
              variant="body2"
              sx={{ color: '#999', fontSize: '0.8rem' }}
              suppressHydrationWarning
            >
              {lastUpdate
                ? lastUpdate.toLocaleTimeString('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '--:--:--'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: '#888', fontSize: '0.8rem' }}
            >
              เปิด:{' '}
              <span style={{ color: '#333', fontWeight: 600 }}>
                {isMounted ? `$${openPrice.toFixed(2)}` : '$---.--'}
              </span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: '#888', fontSize: '0.8rem' }}
            >
              ก่อนหน้า:{' '}
              <span style={{ color: '#333', fontWeight: 600 }}>
                {isMounted ? `$${previousClose.toFixed(2)}` : '$---.--'}
              </span>
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards - Cream & Blue Style */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            sx={{
              background: '#ffffff',
              border: '1px solid #AAC4F5',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(140, 169, 255, 0.1)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography
                variant="caption"
                sx={{ color: '#888', fontWeight: 500, fontSize: '0.7rem' }}
              >
                สูงสุด ({DATE_RANGE_CONFIG[dateRange].label})
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#8CA9FF',
                  fontFamily: '"SF Mono", "Roboto Mono", monospace',
                  fontWeight: 600,
                }}
              >
                {isMounted ? `$${highPrice.toFixed(2)}` : '$---.--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            sx={{
              background: '#ffffff',
              border: '1px solid #AAC4F5',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(140, 169, 255, 0.1)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography
                variant="caption"
                sx={{ color: '#888', fontWeight: 500, fontSize: '0.7rem' }}
              >
                ต่ำสุด ({DATE_RANGE_CONFIG[dateRange].label})
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#E8A87C',
                  fontFamily: '"SF Mono", "Roboto Mono", monospace',
                  fontWeight: 600,
                }}
              >
                {isMounted ? `$${lowPrice.toFixed(2)}` : '$---.--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            sx={{
              background: '#ffffff',
              border: '1px solid #AAC4F5',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(140, 169, 255, 0.1)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography
                variant="caption"
                sx={{ color: '#888', fontWeight: 500, fontSize: '0.7rem' }}
              >
                ราคาเปิด
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#333',
                  fontFamily: '"SF Mono", "Roboto Mono", monospace',
                  fontWeight: 600,
                }}
              >
                {isMounted ? `$${openPrice.toFixed(2)}` : '$---.--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            sx={{
              background: '#ffffff',
              border: '1px solid #AAC4F5',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(140, 169, 255, 0.1)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography
                variant="caption"
                sx={{ color: '#888', fontWeight: 500, fontSize: '0.7rem' }}
              >
                SPREAD
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#333',
                  fontFamily: '"SF Mono", "Roboto Mono", monospace',
                  fontWeight: 600,
                }}
              >
                0.30
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Date Range Selector */}
      <Paper
        sx={{
          background: '#ffffff',
          borderRadius: 3,
          mb: 2,
          border: '1px solid #AAC4F5',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderBottom: '1px solid #eee',
          }}
        >
          <CalendarMonthIcon sx={{ color: '#8CA9FF', mr: 1, fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
            ช่วงเวลา
          </Typography>
        </Box>
        <Tabs
          value={dateRange}
          onChange={handleDateRangeChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              minWidth: 60,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#888',
              '&.Mui-selected': {
                color: '#8CA9FF',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#8CA9FF',
            },
          }}
        >
          <Tab label="1 วัน" value="1D" />
          <Tab label="1 สัปดาห์" value="1W" />
          <Tab label="1 เดือน" value="1M" />
          <Tab label="3 เดือน" value="3M" />
          <Tab label="6 เดือน" value="6M" />
          <Tab label="1 ปี" value="1Y" />
          <Tab label="ทั้งหมด" value="ALL" />
        </Tabs>
      </Paper>

      {/* Timeframe Selector - Cream & Blue Style */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
          แท่งเทียน:
        </Typography>
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={handleTimeframeChange}
          size="small"
          sx={{
            background: '#ffffff',
            borderRadius: 2,
            border: '1px solid #AAC4F5',
            '& .MuiToggleButton-root': {
              color: '#888',
              border: 'none',
              px: 2,
              py: 0.8,
              fontSize: '0.75rem',
              fontWeight: 600,
              '&.Mui-selected': {
                backgroundColor: '#8CA9FF',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#7A99EE',
                },
              },
              '&:hover': {
                backgroundColor: '#FFF2C6',
              },
            },
          }}
        >
          <ToggleButton value="1M">1 นาที</ToggleButton>
          <ToggleButton value="5M">5 นาที</ToggleButton>
          <ToggleButton value="15M">15 นาที</ToggleButton>
          <ToggleButton value="1H">1 ชม.</ToggleButton>
          <ToggleButton value="4H">4 ชม.</ToggleButton>
          <ToggleButton value="1D">1 วัน</ToggleButton>
        </ToggleButtonGroup>

        {/* Zoom Controls - ชิดขวา */}
        <Box
          sx={{
            ml: 'auto',
            display: 'flex',
            gap: 0.5,
            background: '#ffffff',
            borderRadius: 2,
            padding: '4px',
            border: '1px solid #AAC4F5',
          }}
        >
          <Tooltip title="ซูมเข้า" arrow>
            <IconButton
              size="small"
              onClick={() => {
                if (chartRef.current) {
                  const timeScale = chartRef.current.timeScale();
                  const currentRange = timeScale.getVisibleLogicalRange();
                  if (currentRange) {
                    const rangeSize = currentRange.to - currentRange.from;
                    const newSize = rangeSize * 0.7;
                    // ให้แท่งเทียนล่าสุดชิดขวา
                    timeScale.setVisibleLogicalRange({
                      from: currentRange.to - newSize,
                      to: currentRange.to,
                    });
                  }
                }
              }}
              sx={{
                color: '#8CA9FF',
                '&:hover': { backgroundColor: 'rgba(140, 169, 255, 0.2)' },
              }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="ซูมออก" arrow>
            <IconButton
              size="small"
              onClick={() => {
                if (chartRef.current) {
                  const timeScale = chartRef.current.timeScale();
                  const currentRange = timeScale.getVisibleLogicalRange();
                  if (currentRange) {
                    const rangeSize = currentRange.to - currentRange.from;
                    const newSize = rangeSize * 1.4;
                    // ให้แท่งเทียนล่าสุดชิดขวา
                    timeScale.setVisibleLogicalRange({
                      from: currentRange.to - newSize,
                      to: currentRange.to,
                    });
                  }
                }
              }}
              sx={{
                color: '#8CA9FF',
                '&:hover': { backgroundColor: 'rgba(140, 169, 255, 0.2)' },
              }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="รีเซ็ตมุมมอง" arrow>
            <IconButton
              size="small"
              onClick={() => {
                if (chartRef.current) {
                  chartRef.current.timeScale().fitContent();
                }
              }}
              sx={{
                color: '#8CA9FF',
                '&:hover': { backgroundColor: 'rgba(140, 169, 255, 0.2)' },
              }}
            >
              <ZoomOutMapIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Chart - Cream & Blue Style */}
      <Paper
        sx={{
          background: '#FFF8DE',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #AAC4F5',
          boxShadow: '0 4px 20px rgba(140, 169, 255, 0.15)',
          minHeight: 500,
        }}
      >
        <Box ref={chartContainerRef} sx={{ width: '100%', height: 500 }} />
      </Paper>

      {/* Footer Info */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#aaa' }}>
          Data is simulated for demonstration purposes • EA Dashboard © 2024
        </Typography>
      </Box>
    </Box>
  );
}
