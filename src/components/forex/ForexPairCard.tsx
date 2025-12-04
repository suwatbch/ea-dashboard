'use client';

import { Box, Paper, Typography, Skeleton } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { ForexPair, ForexQuote, FOREX_COLORS } from '@/types/forex';

interface ForexPairCardProps {
  pair: ForexPair;
  quote?: ForexQuote;
  loading?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export default function ForexPairCard({
  pair,
  quote,
  loading = false,
  selected = false,
  onClick,
}: ForexPairCardProps) {
  const isPositive = quote && quote.change >= 0;

  const formatPrice = (price: number) => {
    if (!price) return '-';
    // USD/JPY มีทศนิยม 3 ตำแหน่ง, อื่นๆ 5 ตำแหน่ง
    const decimals = pair.quote === 'JPY' || pair.quote === 'THB' ? 3 : 5;
    return price.toFixed(decimals);
  };

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        bgcolor: selected ? FOREX_COLORS.accent : FOREX_COLORS.card,
        border: `1px solid ${
          selected ? FOREX_COLORS.highlight : FOREX_COLORS.border
        }`,
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: FOREX_COLORS.accent,
          borderColor: FOREX_COLORS.highlight,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Header - Symbol & Flags */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontSize: '1.5rem', mr: 1 }}>{pair.flag1}</Typography>
        <Typography sx={{ fontSize: '1.5rem', mr: 1.5 }}>
          {pair.flag2}
        </Typography>
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: FOREX_COLORS.text,
            }}
          >
            {pair.symbol}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: FOREX_COLORS.textSecondary,
            }}
          >
            {pair.name}
          </Typography>
        </Box>
      </Box>

      {/* Price */}
      {loading ? (
        <Skeleton
          variant="text"
          width="80%"
          height={40}
          sx={{ bgcolor: FOREX_COLORS.border }}
        />
      ) : (
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '1.5rem',
            color: FOREX_COLORS.text,
            fontFamily: 'monospace',
          }}
        >
          {formatPrice(quote?.price || 0)}
        </Typography>
      )}

      {/* Change */}
      {loading ? (
        <Skeleton
          variant="text"
          width="60%"
          sx={{ bgcolor: FOREX_COLORS.border }}
        />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          {isPositive ? (
            <TrendingUpIcon
              sx={{ fontSize: 18, color: FOREX_COLORS.success, mr: 0.5 }}
            />
          ) : (
            <TrendingDownIcon
              sx={{ fontSize: 18, color: FOREX_COLORS.danger, mr: 0.5 }}
            />
          )}
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isPositive ? FOREX_COLORS.success : FOREX_COLORS.danger,
              fontFamily: 'monospace',
            }}
          >
            {isPositive ? '+' : ''}
            {formatPrice(quote?.change || 0)} (
            {quote?.changePercent?.toFixed(2) || '0.00'}%)
          </Typography>
        </Box>
      )}

      {/* Bid / Ask */}
      {!loading && quote && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px solid ${FOREX_COLORS.border}`,
          }}
        >
          <Box>
            <Typography
              sx={{ fontSize: '0.7rem', color: FOREX_COLORS.textSecondary }}
            >
              BID
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: FOREX_COLORS.bid,
                fontFamily: 'monospace',
              }}
            >
              {formatPrice(quote.bid)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{ fontSize: '0.7rem', color: FOREX_COLORS.textSecondary }}
            >
              ASK
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: FOREX_COLORS.ask,
                fontFamily: 'monospace',
              }}
            >
              {formatPrice(quote.ask)}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
