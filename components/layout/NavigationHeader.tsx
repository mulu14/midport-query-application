/**
 * @fileoverview Navigation Header Component with Tenant Management Access
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home, Database } from 'lucide-react';

/**
 * Navigation Header Component
 */
export function NavigationHeader() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Query Platform',
      href: '/',
      icon: Home,
      active: pathname === '/'
    },
    {
      name: 'Credentials Management',
      href: '/credentials',
      icon: Settings,
      active: pathname === '/credentials'
    }
  ];

  return (
    <header className="backdrop-blur-sm border-b border-white/20 sticky top-0 z-40" style={{backgroundColor: '#004766'}}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-lg font-bold text-white">Midport Scandinavia</h1>
              <p className="text-xs text-gray-200 -mt-1">Query Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${item.active
                      ? 'text-white border border-white/30'
                      : 'text-gray-200 hover:text-white hover:bg-white/10'
                    }
                  `}
                  style={{
                    backgroundColor: item.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}