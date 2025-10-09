/**
 * @fileoverview Footer Component for Application Footer
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React from 'react';

/**
 * Props interface for Footer component
 * @interface FooterProps
 */
interface FooterProps {
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Footer component for displaying application footer with copyright and links
 * Provides consistent footer styling across the application
 * @component Footer
 * @param {FooterProps} props - Component props
 * @returns {JSX.Element} Footer element with copyright and navigation links
 */
export default function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`relative z-10 backdrop-blur-sm border-t border-white/20 p-4 lg:p-6 ${className}`} style={{backgroundColor: '#004766'}}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center text-white text-sm">
          <p className="mb-2">© {currentYear} MIDPORT Query Platform</p>
          <div className="flex justify-center gap-8 text-xs">
            <a href="#" className="hover:text-gray-200 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-200 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-200 transition-colors">Documentation</a>
            <a href="#" className="hover:text-gray-200 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
