/**
 * @fileoverview Authentication Provider Component
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Protects routes and UI components by checking authentication status.
 * Shows login prompt for unauthenticated users.
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { LogIn, UserPlus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthProviderProps {
  children: React.ReactNode;
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

/**
 * AuthProvider Component
 * Wraps protected content and shows login prompt if user is not authenticated
 */
export function AuthProvider({ children, onLoginClick, onSignUpClick }: AuthProviderProps) {
  const { data: session, status } = useSession();

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              Authentication Required
            </h2>
            
            <p className="text-gray-200 mb-6">
              Please log in to access the Query Platform and manage your database credentials.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={onLoginClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Log In
              </Button>
              
              <Button
                onClick={onSignUpClick}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10 font-medium py-3"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create Account
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-sm text-gray-300">
                Secure access to your database connections and query history
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated - show protected content
  return <>{children}</>;
}
