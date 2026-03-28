// Per-page title + breadcrumb + action buttons
export interface PageHeaderProps {
  title: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
}

import React from 'react';

export function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {breadcrumb && (
          <p className="text-sm text-gray-500">{breadcrumb.join(' / ')}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
