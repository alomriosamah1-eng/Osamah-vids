import { cn } from '@/lib/cn';
import type { CSSProperties, ReactNode } from 'react';

export function GlassCard({ children, className, style, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div className={cn('glass', className)} style={style} onClick={onClick}>
      {children}
    </div>
  );
}