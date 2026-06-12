import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Login } from '../pages/Login';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentAccount } = useAuth();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const prevAuth     = useRef(false);

  useEffect(() => {
    const wasAuth = prevAuth.current;
    prevAuth.current = isAuthenticated;

    if (wasAuth && !isAuthenticated) {
      // Logged out — wipe every cached query so the next user never sees stale data
      queryClient.clear();
    }
    if (!wasAuth && isAuthenticated) {
      // Agents have no dashboard — send them straight to their ticket list
      const dest = currentAccount?.role === 'Agent (end-user)' ? '/tickets' : '/';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, currentAccount, navigate, queryClient]);

  if (!isAuthenticated) return <Login />;
  return <>{children}</>;
};
