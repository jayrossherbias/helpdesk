import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, AlertTriangle, Zap, UserCheck, CheckCircle,
  X, Check, ChevronRight, Filter, BellOff, Eye,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useTickets }       from '../context/TicketContext';
import { useTheme }         from '../context/ThemeContext';
import { BRANCH_CONFIG, BRANCHES }    from '../types';
import type { AppNotification, NotificationType, Branch } from '../types';

// ── helpers ────────────────────────────────────────────────────
const relTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
};

const TYPE_META: Record<NotificationType, {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  darkBg:    string; darkText:  string; darkBorder: string;
  lightBg:   string; lightText: string; lightBorder: string;
  label:     string;
  tabLabel:  string;
}> = {
  sla_warning: {
    icon: AlertTriangle,
    darkBg: 'bg-amber-500/10',  darkText: 'text-amber-400',  darkBorder: 'border-amber-500/20',
    lightBg: 'bg-amber-100',    lightText: 'text-amber-700', lightBorder: 'border-amber-200',
    label: 'SLA Warning', tabLabel: 'SLA Warnings',
  },
  escalation: {
    icon: Zap,
    darkBg: 'bg-orange-500/10', darkText: 'text-orange-400', darkBorder: 'border-orange-500/20',
    lightBg: 'bg-orange-100',   lightText: 'text-orange-700',lightBorder: 'border-orange-200',
    label: 'Escalation', tabLabel: 'Escalations',
  },
  ticket_assigned: {
    icon: UserCheck,
    darkBg: 'bg-blue-500/10',   darkText: 'text-blue-400',   darkBorder: 'border-blue-500/20',
    lightBg: 'bg-blue-100',     lightText: 'text-blue-700',  lightBorder: 'border-blue-200',
    label: 'Assignment', tabLabel: 'Assignments',
  },
  ticket_resolved: {
    icon: CheckCircle,
    darkBg: 'bg-green-500/10',  darkText: 'text-green-400',  darkBorder: 'border-green-500/20',
    lightBg: 'bg-green-100',    lightText: 'text-green-700', lightBorder: 'border-green-200',
    label: 'Resolved', tabLabel: 'Resolved',
  },
};

type TabType = 'all' | NotificationType;

// ── NotificationRow ────────────────────────────────────────────
const NotificationRow: React.FC<{
  n: AppNotification;
  isDark: boolean;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick: (n: AppNotification) => void;
}> = ({ n, isDark, onRead, onDismiss, onClick }) => {
  const meta   = TYPE_META[n.type];
  const Icon   = meta.icon;
  const bgCls  = isDark ? meta.darkBg   : meta.lightBg;
  const txtCls = isDark ? meta.darkText : meta.lightText;
  const brdCls = isDark ? meta.darkBorder : meta.lightBorder;
  const cfg    = BRANCH_CONFIG[n.branch as Branch] ?? { dotClass: 'bg-slate-500', color: '#64748b', label: n.branch };

  return (
    <div
      className={`relative flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors group ${
        !n.read
          ? isDark ? 'bg-blue-500/5 hover:bg-blue-500/8' : 'bg-blue-50/60 hover:bg-blue-100/50'
          : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50/80'
      }`}
      onClick={() => onClick(n)}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="absolute right-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Type icon */}
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${bgCls}`}>
        <Icon size={18} className={txtCls} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${bgCls} ${txtCls} ${brdCls}`}>
                {meta.label}
              </span>
              {n.priority && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  n.priority === 'Critical'
                    ? isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-700 border-red-200'
                  : n.priority === 'High'
                    ? isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-100 text-orange-700 border-orange-200'
                  : n.priority === 'Medium'
                    ? isDark ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {n.priority}
                </span>
              )}
              <div className="flex items-center gap-1">
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />}
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{n.branch}</span>
              </div>
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'} line-clamp-1`}>
              {n.title}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'} line-clamp-2`}>
              {n.message}
            </p>
          </div>

          {/* Right side: time + actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs whitespace-nowrap ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              {relTime(n.createdAt)}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!n.read && (
                <button
                  onClick={e => { e.stopPropagation(); onRead(n.id); }}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-100'
                  }`}
                  title="Mark as read"
                >
                  <Eye size={13} />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-600 hover:bg-red-50'
                }`}
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Ticket ID link */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
            isDark ? 'bg-slate-800 text-blue-400 border-slate-700' : 'bg-gray-50 text-blue-600 border-gray-200'
          }`}>
            {n.ticketId}
          </span>
          <span className={`text-xs flex items-center gap-0.5 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            <ChevronRight size={11} /> view ticket
          </span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser }                                   = useTickets();
  const { notifications, markRead, markAllRead, dismiss } = useNotifications();
  const { theme }                                         = useTheme();
  const isDark = theme === 'dark';

  const isGlobal =
    currentUser.role === 'Main Branch IT Manager' ||
    (currentUser.role === 'Branch IT Supervisor' && currentUser.branch === 'Main Branch');

  const [tab,          setTab]          = useState<TabType>('all');
  const [branchFilter, setBranchFilter] = useState<Branch | 'All'>('All');
  const [showUnread,   setShowUnread]   = useState(false);

  // Branch-scoped visibility
  const scopedNotifs = notifications.filter(n =>
    isGlobal || n.branch === currentUser.branch,
  );

  // Apply tab + extra filters
  const filtered = scopedNotifs
    .filter(n => tab === 'all' || n.type === tab)
    .filter(n => !isGlobal || branchFilter === 'All' || n.branch === branchFilter)
    .filter(n => !showUnread || !n.read);

  const unreadCount = scopedNotifs.filter(n => !n.read).length;

  const countByType = (t: NotificationType) =>
    scopedNotifs.filter(n => n.type === t && !n.read).length;

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    navigate(`/tickets/${n.ticketId}`);
  };

  const card = `rounded-xl shadow-sm border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;
  const selectCls = `px-3 py-2 rounded-lg text-sm outline-none border focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`;

  return (
    <div className="space-y-5 pb-4">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bell size={22} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {isGlobal
              ? `All-branch notification feed · ${scopedNotifs.length} total`
              : `${currentUser.branch} notifications · ${scopedNotifs.length} total`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Unread toggle */}
          <button
            onClick={() => setShowUnread(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              showUnread
                ? isDark ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200'
                : isDark ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-800'
            }`}
          >
            <Filter size={12} />
            {showUnread ? 'Unread only' : 'All'}
          </button>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead(currentUser.branch, isGlobal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Check size={12} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── TYPE SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.entries(TYPE_META) as [NotificationType, typeof TYPE_META[NotificationType]][]).map(([type, meta]) => {
          const count   = scopedNotifs.filter(n => n.type === type).length;
          const unread  = countByType(type);
          const Icon    = meta.icon;
          const isActive = tab === type;
          return (
            <button
              key={type}
              onClick={() => setTab(isActive ? 'all' : type)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? isDark ? `${meta.darkBg} ${meta.darkBorder} border` : `${meta.lightBg} ${meta.lightBorder} border`
                  : isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${isDark ? meta.darkBg : meta.lightBg}`}>
                  <Icon size={16} className={isDark ? meta.darkText : meta.lightText} />
                </div>
                {unread > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600'}`}>
                    {unread} new
                  </span>
                )}
              </div>
              <p className={`text-xl font-light ${isDark ? 'text-white' : 'text-gray-900'}`}>{count}</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{meta.tabLabel}</p>
            </button>
          );
        })}
      </div>

      {/* ── FILTERS ROW ── */}
      <div className={`${card} px-5 py-3.5 flex flex-wrap items-center gap-4`}>
        {/* Type tabs */}
        <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {([
            { key: 'all'             as TabType, label: 'All',         icon: null         },
            { key: 'sla_warning'     as TabType, label: 'SLA',         icon: AlertTriangle },
            { key: 'escalation'      as TabType, label: 'Escalations', icon: Zap           },
            { key: 'ticket_assigned' as TabType, label: 'Assignments', icon: UserCheck     },
            { key: 'ticket_resolved' as TabType, label: 'Resolved',    icon: CheckCircle   },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                tab === t.key
                  ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.icon && <t.icon size={11} />}
              {t.label}
            </button>
          ))}
        </div>

        {/* Branch filter — Main only */}
        {isGlobal && (
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value as Branch | 'All')}
            className={selectCls}
          >
            <option value="All">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}

        <span className={`text-xs ml-auto ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
          Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── NOTIFICATION LIST ── */}
      <div className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center gap-4 py-16 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            <div className={`p-4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <BellOff size={28} className="opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-sm">No notifications found</p>
              {showUnread && (
                <button
                  onClick={() => setShowUnread(false)}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Show all notifications
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
            {filtered.map(n => (
              <NotificationRow
                key={n.id}
                n={n}
                isDark={isDark}
                onRead={markRead}
                onDismiss={dismiss}
                onClick={handleClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};