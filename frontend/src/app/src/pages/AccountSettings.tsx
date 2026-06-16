import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getMe, updateMe } from '../../../api/auth';
import { User, Lock, Save, Check, AlertCircle, Mail, Building2 } from 'lucide-react';
import { DEPARTMENT_LABELS } from '../types';

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, Math.min(3, local.length))}***@${domain}`;
};

export const AccountSettings = () => {
  const { theme } = useTheme();
  const { currentAccount, refreshMe } = useAuth();
  const isDark = theme === 'dark';

  // Profile state — seeded from the /auth/me/ response to get separate first/last name
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg,    setProfileMsg]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving,  setPwdSaving]  = useState(false);
  const [pwdMsg,     setPwdMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getMe().then(p => {
      setFirstName(p.first_name);
      setLastName(p.last_name);
    }).catch(() => {});
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateMe({ first_name: firstName.trim(), last_name: lastName.trim() });
      await refreshMe();
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.response?.data?.detail ?? 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPwdSaving(true);
    try {
      await updateMe({ current_password: currentPwd, new_password: newPwd });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.current_password ?? data?.new_password ?? data?.detail ?? 'Failed to change password.';
      setPwdMsg({ type: 'error', text: msg });
    } finally {
      setPwdSaving(false);
    }
  };

  const cardCls  = `rounded-xl border p-6 transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;
  const inputCls = `w-full px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-gray-300 text-slate-900 placeholder-gray-400'}`;
  const labelCls = `text-xs uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`;

  const Feedback = ({ msg }: { msg: { type: 'success' | 'error'; text: string } }) => (
    <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border ${
      msg.type === 'success'
        ? isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
        : isDark ? 'bg-red-500/10 border-red-500/20 text-red-400'       : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {msg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg.text}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page header */}
      <div>
        <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Settings</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Manage your personal information and login credentials.
        </p>
      </div>

      {/* Read-only account info */}
      <div className={`${cardCls} space-y-3`}>
        <h2 className={`text-xs uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Account Info
        </h2>
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
          {[
            { label: 'Role',   icon: User,      value: currentAccount?.role ?? '—' },
            { label: 'Branch', icon: Building2, value: currentAccount?.branch ?? '—' },
          ].map(item => (
            <div key={item.label}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{item.label}</p>
              <p className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <item.icon size={13} className={isDark ? 'text-slate-500 shrink-0' : 'text-gray-400 shrink-0'} />
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Profile card */}
      <div className={cardCls}>
        <h2 className={`text-xs uppercase tracking-wider mb-5 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <User size={14} />
          Profile Information
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email <span className="normal-case opacity-60">(used for login — contact admin to change)</span></label>
            <input
              type="text"
              value={currentAccount?.email ? maskEmail(currentAccount.email) : ''}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
          </div>

          {profileMsg && <Feedback msg={profileMsg} />}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={profileSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save size={14} />
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password card */}
      <div className={cardCls}>
        <h2 className={`text-xs uppercase tracking-wider mb-5 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <Lock size={14} />
          Change Password
        </h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className={labelCls}>Current Password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              className={inputCls}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>New Password</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                className={inputCls}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className={inputCls}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwdMsg && <Feedback msg={pwdMsg} />}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwdSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Lock size={14} />
              {pwdSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
