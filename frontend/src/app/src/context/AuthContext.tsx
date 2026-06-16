import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, Branch } from '../types';
import { login as apiLogin, logout as apiLogout, restoreSession, getMe, googleLogin as apiGoogleLogin } from '../../../api/auth';
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
  isLoading: boolean;
  currentAccount: Account | null;
  accounts: Account[];
  login: (email: string, password: string, branch?: Branch | 'All') => Promise<string | null>;
  loginWithGoogle: (credential: string) => Promise<string | null>;
  logout: () => void;
  refreshAccounts: () => void;
  refreshMe: () => Promise<void>;
  addAccount: (data: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, data: Partial<Pick<Account, 'name' | 'email' | 'role' | 'branch' | 'active'>>) => void;
  resetPassword: (id: string, newPassword: string) => void;
  deleteAccount: (id: string) => void;
}

const API_ROLE_TO_FIGMA: Record<string, Role> = {
  agent:               'Agent (end-user)',
  branch_technician:   'Branch IT Technician',
  branch_supervisor:   'Branch IT Supervisor',
  main_it_supervisor:  'Main Branch IT Supervisor',
  main_it_manager:     'Main Branch IT Manager',
};

function mapProfileToAccount(profile: UserProfile): Account {
  return {
    id:         String(profile.id),
    name:       [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession()
      .then(profile => {
        if (profile) {
          setCurrentAccount(mapProfileToAccount(profile));
          getUsers().then(users => setAccounts(users.map(mapProfileToAccount))).catch(() => {});
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string, _branch?: Branch | 'All'): Promise<string | null> => {
    try {
      const profile = await apiLogin(email, password);
      const account = mapProfileToAccount(profile);
      setCurrentAccount(account);
      getUsers().then(users => setAccounts(users.map(mapProfileToAccount))).catch(() => {});
      return null;
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.detail ?? data?.non_field_errors?.[0] ?? data?.email?.[0];
      if (msg) return msg;
      return 'Login failed. Please try again.';
    }
  };

  const loginWithGoogle = async (credential: string): Promise<string | null> => {
    try {
      const profile = await apiGoogleLogin(credential);
      const account = mapProfileToAccount(profile);
      setCurrentAccount(account);
      getUsers().then(users => setAccounts(users.map(mapProfileToAccount))).catch(() => {});
      return null;
    } catch (err: any) {
      const data = err?.response?.data;
      return data?.detail ?? 'Google sign-in failed. Please try again.';
    }
  };

  const logout = () => {
    apiLogout().catch(() => {});
    setCurrentAccount(null);
    setAccounts([]);
  };

  const refreshAccounts = () => {
    getUsers().then(users => setAccounts(users.map(mapProfileToAccount))).catch(() => {});
  };

  const refreshMe = async () => {
    try {
      const profile = await getMe();
      setCurrentAccount(mapProfileToAccount(profile));
    } catch {}
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
      isLoading,
      currentAccount,
      accounts,
      login,
      loginWithGoogle,
      logout,
      refreshAccounts,
      refreshMe,
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
