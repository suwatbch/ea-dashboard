'use client';

import dynamic from 'next/dynamic';

const ForexDashboardContent = dynamic(
  () => import('@/components/forex/ForexDashboardContent'),
  { ssr: false }
);

export default function ForexPage() {
  return <ForexDashboardContent />;
}
