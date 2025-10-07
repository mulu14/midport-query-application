/**
 * @fileoverview Root Layout Component for Midport SQL Query Platform
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DatabaseProvider } from '@/lib/DatabaseContext';
import { RemoteAPIProvider } from '@/lib/RemoteAPIContext';
import { SidebarModeProvider } from '@/lib/SidebarModeContext';
import { DatabaseSidebar } from '@/components/layout/DatabaseSidebar';
import Footer from '@/components/layout/Footer';

/**
 * Geist Sans font configuration
 * @constant geistSans
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono font configuration for code display
 * @constant geistMono
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Application metadata configuration
 * @constant metadata
 */
export const metadata: Metadata = {
  title: "MIDPORT Query Platform",
  description: "Advanced SQL query platform with multi-database support",
};

/**
 * Root layout component that wraps the entire application
 * Provides context providers, fonts, and main layout structure
 * Includes sidebar navigation and footer components
 * @component RootLayout
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {JSX.Element} Complete application layout with providers and navigation
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarModeProvider>
          <DatabaseProvider>
            <RemoteAPIProvider>
              <div className="min-h-screen flex flex-col bg-[#237790] relative">
                {/* Circuit board background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#00ffff_1px,transparent_0)] bg-[size:20px_20px]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#00ff88_1px,transparent_0)] bg-[size:40px_40px] opacity-50"></div>
                </div>

                {/* Main layout */}
                <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0">
                  {/* Sidebar */}
                  <div className="w-full lg:w-72 flex-shrink-0 flex flex-col">
                    <div className="flex-1 min-h-0">
                      <DatabaseSidebar />
                    </div>
                  </div>

                  {/* Main content area */}
                  <div className="flex-1 overflow-auto backdrop-blur-sm bg-black/10 min-h-0">
                    {children}
                  </div>
                </div>

                {/* Footer */}
                <Footer />
              </div>
          </RemoteAPIProvider>
        </DatabaseProvider>
        </SidebarModeProvider>
      </body>
    </html>
  );
}
