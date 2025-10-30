/**
 * @fileoverview Protected Content Wrapper with Auth Dialogs
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 * 
 * Wraps protected content and manages authentication dialogs
 */

'use client';

import React, { useState } from 'react';
import { AuthProvider } from './AuthProvider';
import { LoginDialog } from '@/components/layout/LoginDialog';
import { SignUpDialog } from '@/components/layout/SignUpDialog';

interface ProtectedContentProps {
  children: React.ReactNode;
}

/**
 * ProtectedContent Component
 * Manages authentication state and shows login/signup dialogs
 */
export function ProtectedContent({ children }: ProtectedContentProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSignUpDialog, setShowSignUpDialog] = useState(false);

  const handleAuthSuccess = () => {
    setShowLoginDialog(false);
    setShowSignUpDialog(false);
  };

  const switchToSignUp = () => {
    setShowLoginDialog(false);
    setShowSignUpDialog(true);
  };

  const switchToLogin = () => {
    setShowSignUpDialog(false);
    setShowLoginDialog(true);
  };

  return (
    <>
      <AuthProvider
        onLoginClick={() => setShowLoginDialog(true)}
        onSignUpClick={() => setShowSignUpDialog(true)}
      >
        {children}
      </AuthProvider>

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
