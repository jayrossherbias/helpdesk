import React, { createContext, useContext, useState } from 'react';
import { Role, Branch } from '../types';
import { login as apiLogin, logout as apiLogout } from '../../../api/auth';
import type { UserProfile } from '../../../api/auth';
import { getUsers } from '../../../api/accounts';
import { toast } from 'sonner';

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  branch: Branch;
  department: string | null;
  active: boolean;
  createdAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentAccount: Account | null;
  accounts: Account[];
  login: (username: string, password: string, branch?: Branch | 'All') => Promise<string | null>;
  logout: () => void;
  addAccount: (data: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, data: Partial<Pick<Account, 'name' | 'email' | 'role' | 'branch' | 'active'>>) => void;
  resetPassword: (id: string, newPassword: string) => void;
  deleteAccount: (id: string) => void;
}

const API_ROLE_TO_FIGMA: Record<string, Role> = {
  agent:              'Agent (end-user)',
  branch_technician:  'Branch IT Technician',
  branch_supervisor:  'Branch IT Supervisor',
  main_it_manager:    'Main Branch IT Manager',
};

function mapProfileToAccount(profile: UserProfile): Account {
  return {
    id:         String(profile.id),
    name:       profile.username,
    email:      profile.email,
    password:   '',
    role:       API_ROLE_TO_FIGMA[profile.role] ?? 'Agent (end-user)',
    branch:     (profile.branch?.name ?? 'Main Branch') as Branch,
    department: profile.department ?? null,
    active:     profile.is_active,
    createdAt:  profile.date_joined,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const login = async (username: string, password: string, _branch?: Branch | 'All'): Promise<string | null> => {
    try {
      const profile = await apiLogin(username, password);
      const account = mapProfileToAccount(profile);
      setCurrentAccount(account);
      // Load full user list in the background for UserManagement
      getUsers().then(users => setAccounts(users.map(mapProfileToAccount))).catch(() => {});
      return null;
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail) return detail;
      if (err?.response?.status === 401) return 'Invalid username or password.';
      return 'Login failed. Please try again.';
    }
  };

  const logout = () => {
    apiLogout().catch(() => {});
    setCurrentAccount(null);
    setAccounts([]);
  };

  const addAccount = (data: Omit<Account, 'id' | 'createdAt'>) => {
    const newAccount: Account = {
      ...data,
      id:        `u-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAccounts(prev => [...prev, newAccount]);
    toast.info('Account created locally. Connect a backend endpoint to persist.');
  };

  const updateAccount = (id: string, data: Partial<Pick<Account, 'name' | 'email' | 'role' | 'branch' | 'active'>>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    if (currentAccount?.id === id) {
      setCurrentAccount(prev => prev ? { ...prev, ...data } : prev);
    }
  };

  const resetPassword = (id: string, _newPassword: string) => {
    toast.info(`Password reset for user ${id} requires a backend endpoint.`);
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    toast.info('Account removed locally. Connect a backend endpoint to persist.');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!currentAccount,
      currentAccount,
      accounts,
      login,
      logout,
      addAccount,
      updateAccount,
      resetPassword,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
