import type { ReactNode } from 'react';

interface GlobalBackgroundProps {
  children: ReactNode;
}

export default function GlobalBackground({ children }: GlobalBackgroundProps) {
  return <>{children}</>;
}
