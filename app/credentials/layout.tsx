/**
 * @fileoverview Layout for Tenant Management Pages
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import React from 'react';

/**
 * Tenant Management Layout Component
 * Provides a full-width layout without the sidebar for tenant management pages
 */
export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
}