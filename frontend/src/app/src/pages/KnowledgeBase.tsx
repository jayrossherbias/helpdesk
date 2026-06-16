import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Search, ChevronRight, Wifi, Monitor, KeyRound,
  Headphones, Cpu, PhoneCall, Plus, Pencil, Trash2, X, Save,
} from 'lucide-react';

// ── Icon registry ─────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  PhoneCall, Cpu, KeyRound, Wifi, Headphones, Monitor, BookOpen,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

interface Article {
  id: number;
  title: string;
  category: string;
  iconName: string;
  content: string;
}

const DEFAULT_ARTICLES: Article[] = [
  {
    id: 1, iconName: 'PhoneCall',
    title: 'Softphone Not Connecting — Quick Fix Guide',
    category: 'VoIP & Dialer Issues',
    content: 'Step 1: Check your internet connection (run speed test — minimum 10 Mbps required per seat). Step 2: Restart the Zoiper/Five9 application. Step 3: Ensure your headset is properly connected via USB and detected by Windows. Step 4: Re-enter your SIP credentials from the dialer portal. If the issue persists across multiple agents, escalate as a floor-wide incident immediately — agent downtime means direct call volume loss.',
  },
  {
    id: 2, iconName: 'Cpu',
    title: 'CRM Login Failures — Salesforce / Zendesk',
    category: 'CRM & Call Center Software',
    content: 'Common causes: (1) Cached session expired — clear browser cookies and try again. (2) Password expired — request reset from the Account Team. (3) System-wide CRM outage — check the IT status board before filing individual tickets. (4) Multi-factor authentication issues — ensure your registered phone number is accessible. Submit a ticket under "CRM & Call Center Software" if the issue affects more than 2 agents.',
  },
  {
    id: 3, iconName: 'KeyRound',
    title: 'How to Reset Your Call Center Account Password',
    category: 'Account & Access Management',
    content: 'For locked accounts: Contact your floor supervisor first to confirm the lockout. Then submit a ticket under "Account & Access Management" with your employee ID, seat number, and current shift. The Account Team targets a 30-minute resolution for locked accounts during the Morning and Afternoon shifts. Night shift accounts are resolved within 1 hour.',
  },
  {
    id: 4, iconName: 'Wifi',
    title: 'VPN Setup for Remote or Work-From-Home Agents',
    category: 'Network & Connectivity',
    content: 'Download the approved VPN client from the IT portal. Use your corporate email and password to authenticate. Select the server nearest to your region (PH-CEBU, PH-DAVAO, PH-MANILA). Minimum internet speed: 10 Mbps upload for stable call quality. If VPN drops during a shift, reconnect and notify your supervisor. Repeated drops should be reported as a "Network & Connectivity" ticket.',
  },
  {
    id: 5, iconName: 'Headphones',
    title: 'Headset Troubleshooting for Call Center Agents',
    category: 'Workstation & Peripherals',
    content: 'If your headset is not detected: (1) Unplug and re-plug into a different USB port. (2) Check Device Manager for driver errors. (3) Try the headset on another PC to confirm it is not defective. (4) Restart the softphone application after reconnecting. Use a borrowed headset as a workaround to avoid call loss. Submit a "Workstation & Peripherals" ticket with your seat number if the issue persists.',
  },
  {
    id: 6, iconName: 'Wifi',
    title: 'Internet Outage — What To Do Immediately',
    category: 'Network & Connectivity',
    content: 'If your floor loses internet: (1) Immediately notify your floor supervisor — do NOT wait. (2) One representative should submit a floor-wide ticket under "Network & Connectivity" on behalf of the affected floor. Mark "Is this a Floor-Wide Incident?" as Yes. (3) Include: floor/building name, estimated agents affected, shift time. The Network Team will prioritize based on agent count and revenue impact. Do NOT submit individual tickets for the same outage.',
  },
  {
    id: 7, iconName: 'Monitor',
    title: 'Understanding Shift Schedules & IT Support Hours',
    category: 'Account & Access Management',
    content: 'IT Support operates 24/7 across three shifts:\n• Morning: 6:00 AM – 2:00 PM\n• Afternoon: 2:00 PM – 10:00 PM\n• Night: 10:00 PM – 6:00 AM\n\nCritical tickets (20+ agents affected) are responded to within 1 hour regardless of shift. High priority tickets (5-19 agents): 4 hours. Medium (2-4 agents): 8 hours. Low (single agent): 24 hours. If you submit a ticket and it is not assigned within 30 minutes for a Critical issue, escalate directly to your IT supervisor.',
  },
  {
    id: 8, iconName: 'Monitor',
    title: 'New Workstation Setup for Call Center Agents',
    category: 'Workstation & Peripherals',
    content: 'When setting up a new agent workstation: (1) Connect monitor, keyboard, mouse, and headset before powering on. (2) Log in with your domain account (format: emp.lastname@bpo.com). (3) Wait for Group Policy to apply — this may take 5–10 minutes on first login. (4) Launch the softphone application and log in with your dialer credentials. (5) Test a call before the shift starts. Report any setup issues to the Workstation Team with your seat number and employee ID.',
  },
];

const KB_STORAGE_KEY = 'kb_articles';

function loadArticles(): Article[] {
  try {
    const stored = localStorage.getItem(KB_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Article[];
  } catch {}
  return DEFAULT_ARTICLES;
}

function saveArticles(articles: Article[]) {
  localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(articles));
}

const CATEGORIES = [
  'All',
  'VoIP & Dialer Issues',
  'CRM & Call Center Software',
  'Account & Access Management',
  'Network & Connectivity',
  'Workstation & Peripherals',
];

const ARTICLE_CATEGORIES = CATEGORIES.slice(1);

const emptyForm = (): Omit<Article, 'id'> => ({
  title: '', category: 'VoIP & Dialer Issues', iconName: 'PhoneCall', content: '',
});

// ─────────────────────────────────────────────────────────────
export const KnowledgeBase = () => {
  const { theme } = useTheme();
  const { currentAccount } = useAuth();
  const isDark = theme === 'dark';

  const canManage = currentAccount?.role === 'Main Branch IT Manager';

  const [articles,        setArticles]        = useState<Article[]>(loadArticles);
  const [search,          setSearch]          = useState('');
  const [expanded,        setExpanded]        = useState<number | null>(null);
  const [categoryFilter,  setCategoryFilter]  = useState('All');

  // Modal state
  const [showModal,   setShowModal]   = useState(false);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [form,        setForm]        = useState<Omit<Article, 'id'>>(emptyForm());
  const [deleteId,    setDeleteId]    = useState<number | null>(null);

  useEffect(() => { saveArticles(articles); }, [articles]);

  const filtered = articles.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (a: Article) => {
    setEditingId(a.id);
    setForm({ title: a.title, category: a.category, iconName: a.iconName, content: a.content });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingId !== null) {
      setArticles(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
    } else {
      const newId = Date.now();
      setArticles(prev => [...prev, { id: newId, ...form }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    if (expanded === id) setExpanded(null);
    setDeleteId(null);
  };

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark
      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
      : 'bg-white border-gray-300 text-slate-900 placeholder-gray-400'
  }`;
  const labelCls = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-2xl flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <BookOpen size={26} className="text-blue-500" /> Knowledge Base
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            BPO IT self-service guides. Check here before submitting a ticket — agent downtime is costly.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0"
          >
            <Plus size={15} /> Add Article
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-slate-900 placeholder-gray-400'}`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className={`px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-slate-900'}`}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Article count */}
      <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
        {filtered.length} article{filtered.length !== 1 ? 's' : ''}{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''}
      </p>

      {/* Article list */}
      <div className="space-y-3">
        {filtered.map(article => {
          const Icon = ICON_MAP[article.iconName] ?? BookOpen;
          return (
            <div
              key={article.id}
              className={`rounded-xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center gap-2 pr-3">
                <button
                  onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                  className="flex-1 flex items-center gap-4 p-5 text-left"
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{article.title}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{article.category}</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`shrink-0 transition-transform ${expanded === article.id ? 'rotate-90' : ''} ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
                  />
                </button>

                {/* Admin action buttons */}
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(article)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                      title="Edit article"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(article.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                      title="Delete article"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {expanded === article.id && (
                <div className={`px-5 pb-5 border-t ${isDark ? 'text-slate-300 border-slate-800' : 'text-gray-600 border-gray-200'}`}>
                  <p className="pt-4 text-sm whitespace-pre-wrap leading-relaxed">{article.content}</p>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            No articles found.
          </p>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId !== null ? 'Edit Article' : 'New Article'}
              </h2>
              <button onClick={() => setShowModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}>
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className={labelCls}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Article title"
                  className={inputCls}
                  autoFocus
                />
              </div>

              {/* Category + Icon row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls}
                  >
                    {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Icon</label>
                  <select
                    value={form.iconName}
                    onChange={e => setForm(f => ({ ...f, iconName: e.target.value }))}
                    className={inputCls}
                  >
                    {ICON_OPTIONS.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className={labelCls}>Content</label>
                <textarea
                  rows={6}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write the article content here..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 p-5 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} /> {editingId !== null ? 'Save Changes' : 'Add Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl border p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Article?</h2>
            <p className={`text-sm mb-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              This will permanently remove the article from the Knowledge Base.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
