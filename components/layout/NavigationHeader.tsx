/**
 * @fileoverview Navigation Header Component with Tenant Management Access
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home, Database, LogIn, UserPlus, User, LogOut } from 'lucide-react';
import { LoginDialog } from './LoginDialog';
import { SignUpDialog } from './SignUpDialog';
import { Button } from '@/components/ui/button';

/**
 * Navigation Header Component
 */
export function NavigationHeader() {
  const pathname = usePathname();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSignUpDialog, setShowSignUpDialog] = useState(false);
  const [user, setUser] = useState<{ username: string; tenant: string } | null>(null);

  /**
   * Check for stored user session on mount
   */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  /**
   * Handle successful login/signup
   */
  const handleAuthSuccess = (userData: { username: string; tenant: string }) => {
    setUser(userData);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  /**
   * Switch from login to signup dialog
   */
  const switchToSignUp = () => {
    setShowLoginDialog(false);
    setShowSignUpDialog(true);
  };

  /**
   * Switch from signup to login dialog
   */
  const switchToLogin = () => {
    setShowSignUpDialog(false);
    setShowLoginDialog(true);
  };

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
    <>
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

            {/* Navigation and Auth */}
            <div className="flex items-center space-x-4">
              {/* Navigation Links */}
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

              {/* Auth Section */}
              <div className="flex items-center space-x-2 border-l border-white/20 pl-4">
                {user ? (
                  // Logged in - show user info and logout
                  <div className="flex items-center space-x-3">
                    <div className="hidden md:block text-right">
                      <div className="text-sm font-medium text-white">{user.username}</div>
                      <div className="text-xs text-gray-300">{user.tenant}</div>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold">
                      <User className="w-4 h-4" />
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 text-sm px-3 py-1.5"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Logout</span>
                    </Button>
                  </div>
                ) : (
                  // Not logged in - show login/signup buttons
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setShowLoginDialog(true)}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 text-sm px-3 py-1.5"
                    >
                      <LogIn className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Login</span>
                    </Button>
                    <Button
                      onClick={() => setShowSignUpDialog(true)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Sign Up</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Dialogs */}
      <LoginDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToSignUp={switchToSignUp}
      />
      <SignUpDialog
        open={showSignUpDialog}
        onClose={() => setShowSignUpDialog(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={switchToLogin}
      />
    </>
  );
}