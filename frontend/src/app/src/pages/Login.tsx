import React, { useState } from 'react';
import { Headphones, LogIn, Eye, EyeOff, AlertCircle, Info, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BRANCHES, BRANCH_CONFIG, Branch } from '../types';

export const Login = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [branchFilter, setBranchFilter] = useState<Branch | 'All'>('All');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const err = await login(email, password, branchFilter);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (username: string, branch: Branch) => {
    setEmail(username);
    setPassword('Test1234!');
    setBranchFilter(branch);
    setError('');
    setLoading(true);
    try {
      const err = await login(username, 'Test1234!', branch);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  const allCredentials = [
    { email: 'agent_mkti1',    role: 'Agent (end-user)',         name: 'agent_mkti1',     branch: 'Makati Branch' as Branch },
    { email: 'agent_bgc1',     role: 'Agent (end-user)',         name: 'agent_bgc1',      branch: 'BGC Branch'    as Branch },
    { email: 'tech_mkti1',     role: 'Branch IT Technician',     name: 'tech_mkti1',      branch: 'Makati Branch' as Branch },
    { email: 'tech_bgc1',      role: 'Branch IT Technician',     name: 'tech_bgc1',       branch: 'BGC Branch'    as Branch },
    { email: 'supervisor_mkti', role: 'Branch IT Supervisor',    name: 'supervisor_mkti', branch: 'Makati Branch' as Branch },
    { email: 'supervisor_bgc',  role: 'Branch IT Supervisor',    name: 'supervisor_bgc',  branch: 'BGC Branch'    as Branch },
    { email: 'admin',           role: 'Main Branch IT Manager',  name: 'admin',           branch: 'Main Branch'   as Branch },
  ];

  const filteredCredentials = branchFilter === 'All'
    ? allCredentials
    : allCredentials.filter(c => c.branch === branchFilter);

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-200 ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-blue-600">
            <Headphones className="text-white" size={32} />
          </div>
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

            {/* Branch selector */}
            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Branch</label>
              <div className="relative">
                <Building2 size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                <select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value as Branch | 'All')}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors border focus:ring-2 focus:ring-blue-500 appearance-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
                >
                  <option value="All">All Branches</option>
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              {branchFilter !== 'All' ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`w-2 h-2 rounded-full ${BRANCH_CONFIG[branchFilter as Branch].dotClass}`} />
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{branchFilter} — data scope set at login</p>
                </div>
              ) : (
                <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Select your branch to set data scope</p>
              )}
            </div>

            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Username</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your_username"
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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm transition-colors"
            >
              <LogIn size={18} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className={`mt-6 rounded-xl border p-5 transition-colors duration-200 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-gray-200'}`}>
          <button
            onClick={() => setShowCredentials(!showCredentials)}
            className={`flex items-center gap-2 text-sm w-full ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Info size={16} />
            <span>Demo Credentials</span>
            <span className="ml-auto text-xs">{showCredentials ? 'Hide' : 'Show'}</span>
          </button>

          {showCredentials && (
            <div className="mt-4 space-y-2">
              {filteredCredentials.map(cred => (
                <button
                  key={cred.email}
                  onClick={() => quickLogin(cred.email, cred.branch)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isDark ? 'bg-slate-950/50 hover:bg-slate-800 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${BRANCH_CONFIG[cred.branch].dotClass}`} />
                    <div className="min-w-0">
                      <span className={`block truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{cred.name}</span>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{cred.email}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>{cred.role}</span>
                    <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{cred.branch}</span>
                  </div>
                </button>
              ))}
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Password for all: <code className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>Test1234!</code>
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <Info size={12} className="inline mr-1 shrink-0" />
                <span className="text-blue-400">admin</span> (Main Branch IT Manager) has global cross-branch access.
              </p>
            </div>
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