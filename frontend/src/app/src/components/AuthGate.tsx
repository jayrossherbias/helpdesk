import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Login } from '../pages/Login';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, currentAccount } = useAuth();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const prevAuth     = useRef(false);

  useEffect(() => {
    const wasAuth = prevAuth.current;
    prevAuth.current = isAuthenticated;

    if (wasAuth && !isAuthenticated) {
      queryClient.clear();
    }
    if (!wasAuth && isAuthenticated) {
      const dest = currentAccount?.role === 'Agent (end-user)' ? '/tickets' : '/';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, currentAccount, navigate, queryClient]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Restoring session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;
  return <>{children}</>;
};
