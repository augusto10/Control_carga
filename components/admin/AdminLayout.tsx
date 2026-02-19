import React from 'react';
import { AppLayout } from '../layout/AppLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

/**
 * @deprecated Use AppLayout instead. This is a compatibility wrapper.
 */
export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <AppLayout title={title}>
      {children}
    </AppLayout>
  );
}
