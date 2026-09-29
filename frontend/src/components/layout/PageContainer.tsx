import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn('p-6 sm:p-7 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6', className)}>
      {children}
    </main>
  );
}
