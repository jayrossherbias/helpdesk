import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

export const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const hiddenGoogleRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    setError('');
    setGoogleLoading(true);
    try {
      const err = await loginWithGoogle(response.credential);
      if (err) setError(err);
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const init = () => {
      if (!window.google || !hiddenGoogleRef.current) return;
      hiddenGoogleRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
        use_fedcm_for_prompt: false,
      } as any);
      window.google.accounts.id.renderButton(hiddenGoogleRef.current, {
        type: 'standard',
        size: 'large',
        locale: 'en',
      });
    };

    if (window.google) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google) { clearInterval(interval); init(); }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [handleGoogleCredential]);

  const handleGoogleClick = () => {
    const btn = hiddenGoogleRef.current?.querySelector('div[role="button"]') as HTMLElement | null;
    btn?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const err = await login(email, password);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-200 ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/gs-logo.svg"
            alt="Global Strategic"
            className="h-14 w-auto mb-4 object-contain"
            style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
          />
          <h1 className={`text-2xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>BPO IT Helpdesk</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>24/7 Operations Support Portal</p>
        </div>

        {/* Login Card */}
        <div className={`rounded-xl p-8 shadow-lg border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@gmail.com"
                required
                className={`w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-300 text-slate-900 placeholder:text-gray-400'}`}
              />
            </div>

            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={`w-full px-4 py-2.5 pr-11 rounded-lg text-sm outline-none transition-colors border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-300 text-slate-900 placeholder:text-gray-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm transition-colors"
            >
              <LogIn size={18} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div className="relative flex items-center my-5">
                <div className={`flex-grow border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />
                <span className={`mx-3 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>or</span>
                <div className={`flex-grow border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />
              </div>

              {/* Hidden Google-rendered button (handles the actual OAuth flow) */}
              <div ref={hiddenGoogleRef} className="absolute opacity-0 pointer-events-none -z-10" aria-hidden="true" />

              {/* Our custom-styled button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading || googleLoading}
                className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {googleLoading ? (
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <div className="flex justify-center mt-4">
          <button onClick={toggleTheme} className={`text-xs ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
            Switch to {isDark ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>
    </div>
  );
};
