import React, { useState } from 'react';
import { useAuth, Account } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Role, Branch, BRANCHES, BRANCH_CONFIG, DEPARTMENT_LABELS } from '../types';
import { UserPlus, Shield, ShieldOff, Trash2, KeyRound, Pencil, X, Check, Search, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { HSelect } from '../components/HSelect';

const roleBadgeColors: Record<Role, { dark: string; light: string }> = {
  'Agent (end-user)':        { dark: 'bg-slate-500/10 text-slate-400',   light: 'bg-slate-100 text-slate-600' },
  'Branch IT Technician':    { dark: 'bg-green-500/10 text-green-400',   light: 'bg-green-100 text-green-700' },
  'Branch IT Supervisor':    { dark: 'bg-purple-500/10 text-purple-400', light: 'bg-purple-100 text-purple-700' },
  'Main Branch IT Manager':  { dark: 'bg-red-500/10 text-red-400',       light: 'bg-red-100 text-red-700' },
};

const roles: Role[] = ['Agent (end-user)', 'Branch IT Technician', 'Branch IT Supervisor', 'Main Branch IT Manager'];

export const UserManagement = () => {
  const { accounts, currentAccount, addAccount, updateAccount, resetPassword, deleteAccount } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; role: Role; branch: Branch }>({
    name: '', email: '', role: 'Agent (end-user)', branch: 'Cebu Branch',
  });
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'Agent (end-user)' as Role, branch: 'Cebu Branch' as Branch });

  const filtered = accounts.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'All' || a.role === filterRole;
    const matchBranch = filterBranch === 'All' || a.branch === filterBranch;
    return matchSearch && matchRole && matchBranch;
  });

  const handleAdd = () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      toast.error('All fields are required.');
      return;
    }
    if (accounts.some(a => a.email === addForm.email)) {
      toast.error('An account with this email already exists.');
      return;
    }
    addAccount({ ...addForm, active: true });
    toast.success(`Account for ${addForm.name} created.`);
    setAddForm({ name: '', email: '', password: '', role: 'Agent (end-user)', branch: 'Cebu Branch' });
    setShowAddModal(false);
  };

  const startEdit = (a: Account) => {
    setEditingId(a.id);
    setEditForm({ name: a.name, email: a.email, role: a.role, branch: a.branch });
  };

  const saveEdit = (id: string) => {
    updateAccount(id, editForm);
    toast.success('Account updated.');
    setEditingId(null);
  };

  const handleResetPassword = (id: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    resetPassword(id, newPassword);
    toast.success('Password reset successfully.');
    setResetId(null);
    setNewPassword('');
  };

  const handleDelete = (a: Account) => {
    if (a.id === currentAccount?.id) {
      toast.error("You can't delete your own account.");
      return;
    }
    deleteAccount(a.id);
    toast.success(`Account ${a.name} deleted.`);
  };

  const toggleActive = (a: Account) => {
    if (a.id === currentAccount?.id) {
      toast.error("You can't deactivate your own account.");
      return;
    }
    updateAccount(a.id, { active: !a.active });
    toast.success(`Account ${a.active ? 'deactivated' : 'activated'}.`);
  };

  const cardClass = `rounded-xl border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;
  const inputCls = `w-full px-4 py-2 rounded-lg text-sm outline-none border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>User Management</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{accounts.length} total accounts across all branches</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
          <UserPlus size={16} /> Add Account
        </button>
      </div>

      {/* Filters */}
      <div className={`${cardClass} p-4 flex flex-wrap gap-3 items-center`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-300 text-slate-900 placeholder:text-gray-400'}`}
          />
        </div>
        <HSelect
          value={filterRole}
          onChange={setFilterRole}
          options={[
            { value: 'All', label: 'All Roles' },
            ...roles.map(r => ({ value: r, label: r })),
          ]}
          isDark={isDark}
        />
        <HSelect
          value={filterBranch}
          onChange={setFilterBranch}
          options={[
            { value: 'All', label: 'All Branches' },
            ...BRANCHES.map(b => ({ value: b, label: b })),
          ]}
          isDark={isDark}
        />
      </div>

      {/* Table */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={isDark ? 'bg-slate-800/50' : 'bg-gray-50'}>
                {['Name', 'Email', 'Branch', 'Role', 'Department', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-3 text-left text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
              {filtered.map(a => {
                const branchCfg = BRANCH_CONFIG[a.branch];
                return (
                  <tr key={a.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-4">
                      {editingId === a.id ? (
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={`px-2 py-1 rounded text-sm border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-gray-300'}`} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                            {a.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.name}</span>
                          {a.id === currentAccount?.id && <span className="text-xs text-blue-400">(you)</span>}
                        </div>
                      )}
                    </td>
                    <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                      {editingId === a.id ? (
                        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={`px-2 py-1 rounded text-sm border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-gray-300'}`} />
                      ) : a.email}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === a.id ? (
                        <HSelect
                          value={editForm.branch}
                          onChange={v => setEditForm({ ...editForm, branch: v as Branch })}
                          options={BRANCHES.map(b => ({ value: b, label: b }))}
                          isDark={isDark}
                          size="sm"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${branchCfg?.dotClass || 'bg-slate-500'}`} />
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{a.branch}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === a.id ? (
                        <HSelect
                          value={editForm.role}
                          onChange={v => setEditForm({ ...editForm, role: v as Role })}
                          options={roles.map(r => ({ value: r, label: r }))}
                          isDark={isDark}
                          size="sm"
                        />
                      ) : (
                        <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? roleBadgeColors[a.role].dark : roleBadgeColors[a.role].light}`}>{a.role}</span>
                      )}
                    </td>
                    <td className={`px-5 py-4 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {a.department
                        ? (DEPARTMENT_LABELS[a.department as keyof typeof DEPARTMENT_LABELS] ?? a.department)
                        : <span className={isDark ? 'text-slate-700' : 'text-gray-300'}>—</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${a.active ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700')}`}>
                        {a.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {editingId === a.id ? (
                          <>
                            <button onClick={() => saveEdit(a.id)} className="p-1.5 rounded-md text-green-400 hover:bg-green-500/10" title="Save"><Check size={15} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-500/10" title="Cancel"><X size={15} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(a)} className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`} title="Edit"><Pencil size={15} /></button>
                            <button onClick={() => toggleActive(a)} className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`} title={a.active ? 'Deactivate' : 'Activate'}>
                              {a.active ? <ShieldOff size={15} /> : <Shield size={15} />}
                            </button>
                            <button onClick={() => { setResetId(a.id); setNewPassword(''); }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`} title="Reset Password"><KeyRound size={15} /></button>
                            <button onClick={() => handleDelete(a)} className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'}`} title="Delete"><Trash2 size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users size={30} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No accounts found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setResetId(null)}>
          <div className={`w-full max-w-sm rounded-xl p-6 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Reset Password</h3>
            <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>For: {accounts.find(a => a.id === resetId)?.email}</p>
            <input
              type="text"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className={`w-full px-4 py-2 rounded-lg text-sm outline-none border focus:ring-2 focus:ring-blue-500 mb-4 ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-300 text-slate-900'}`}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetId(null)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
              <button onClick={() => handleResetPassword(resetId)} className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className={`w-full max-w-md rounded-xl p-6 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Add New Account</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Full Name</label>
                <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Password</label>
                <input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Role</label>
                  <HSelect
                    value={addForm.role}
                    onChange={v => setAddForm({ ...addForm, role: v as Role })}
                    options={roles.map(r => ({ value: r, label: r }))}
                    isDark={isDark}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Branch</label>
                  <HSelect
                    value={addForm.branch}
                    onChange={v => setAddForm({ ...addForm, branch: v as Branch })}
                    options={BRANCHES.map(b => ({ value: b, label: b }))}
                    isDark={isDark}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddModal(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};