import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input, InputProps } from './Input';

interface SearchInputProps extends InputProps {
  containerClassName?: string;
}

export function SearchInput({ containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative flex-1', containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
      <Input
        type="text"
        className={cn('pl-10', className)}
        {...props}
      />
    </div>
  );
}
