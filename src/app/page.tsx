'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const DashboardContent = dynamic(
  () => import('@/components/stock/DashboardContent'),
  { ssr: false }
);

export default function Home() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
