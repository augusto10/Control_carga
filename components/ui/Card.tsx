import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 overflow-hidden', className)}>
      <div className={cn(noPadding ? '' : 'p-6')}>{children}</div>
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, className }: { 
  title: string; 
  subtitle?: string; 
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h3 className="text-lg font-semibold text-textMain">{title}</h3>
        {subtitle && <p className="text-sm text-textMuted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
