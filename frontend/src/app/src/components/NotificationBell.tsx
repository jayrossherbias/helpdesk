import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, BellRing, X, AlertTriangle, Zap, UserCheck,
  CheckCircle, ChevronRight, Check,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useTickets }       from '../context/TicketContext';
import { BRANCH_CONFIG }    from '../types';
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
  darkBg: string;
  darkText: string;
  lightBg: string;
  lightText: string;
  label: string;
}> = {
  sla_warning:     { icon: AlertTriangle, darkBg: 'bg-amber-500/15',  darkText: 'text-amber-400',  lightBg: 'bg-amber-100',  lightText: 'text-amber-600',  label: 'SLA Warning' },
  escalation:      { icon: Zap,           darkBg: 'bg-orange-500/15', darkText: 'text-orange-400', lightBg: 'bg-orange-100', lightText: 'text-orange-600', label: 'Escalation' },
  ticket_assigned: { icon: UserCheck,     darkBg: 'bg-blue-500/15',   darkText: 'text-blue-400',   lightBg: 'bg-blue-100',   lightText: 'text-blue-600',   label: 'Assignment' },
  ticket_resolved: { icon: CheckCircle,   darkBg: 'bg-green-500/15',  darkText: 'text-green-400',  lightBg: 'bg-green-100',  lightText: 'text-green-600',  label: 'Resolved' },
};

// ── NotificationItem ───────────────────────────────────────────
const NotificationItem: React.FC<{
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
  const cfg    = BRANCH_CONFIG[n.branch as Branch] ?? { dotClass: 'bg-slate-500', color: '#64748b', label: n.branch };

  return (
    <div
      className={`relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${
        !n.read
          ? isDark ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'bg-blue-50/80 hover:bg-blue-100/60'
          : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'
      }`}
      onClick={() => onClick(n)}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Type icon */}
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${bgCls}`}>
        <Icon size={15} className={txtCls} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-medium leading-snug line-clamp-1 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            {n.title}
          </p>
          <button
            onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
            className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-gray-300 hover:text-gray-500'}`}
          >
            <X size={11} />
          </button>
        </div>
        <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          {n.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${bgCls} ${txtCls}`}>
            {meta.label}
          </span>
          <div className="flex items-center gap-1">
            {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />}
            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{n.branch}</span>
          </div>
          {n.priority && (
            <span className={`text-xs ${
              n.priority === 'Critical' ? (isDark ? 'text-red-500' : 'text-red-600') :
              n.priority === 'High'     ? (isDark ? 'text-orange-500' : 'text-orange-600') :
              n.priority === 'Medium'   ? (isDark ? 'text-yellow-500' : 'text-yellow-600') :
                                          (isDark ? 'text-slate-500' : 'text-gray-400')
            }`}>{n.priority}</span>
          )}
          <span className={`text-xs ml-auto ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            {relTime(n.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// NotificationBell — renders the bell icon + dropdown panel
// ══════════════════════════════════════════════════════════════
interface NotificationBellProps {
  isDark: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ isDark }) => {
  const navigate = useNavigate();
  const { currentUser }                                  = useTickets();
  const { notifications, markRead, markAllRead, dismiss } = useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef        = useRef<HTMLDivElement>(null);
  const buttonRef       = useRef<HTMLButtonElement>(null);

  const isGlobal =
    currentUser.role === 'Main Branch IT Manager' ||
    (currentUser.role === 'Branch IT Supervisor' && currentUser.branch === 'Main Branch');

  // Branch-scoped notifications
  const visible = notifications.filter(n =>
    isGlobal || n.branch === currentUser.branch,
  );
  const unread  = visible.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    navigate(`/tickets/${n.ticketId}`);
  };

  // Only show the 8 most-recent in the panel
  const panelItems = visible.slice(0, 8);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className={`relative p-2 rounded-lg transition-colors ${
          open
            ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900'
            : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title="Notifications"
      >
        {unread > 0
          ? <BellRing size={18} className={unread > 0 ? (isDark ? 'text-amber-400' : 'text-amber-500') : ''} />
          : <Bell size={18} />
        }
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className={`absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl border z-50 overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`}
          style={{ maxHeight: '520px' }}
        >
          {/* Panel header */}
          <div className={`flex items-center justify-between px-4 py-3.5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2.5">
              <BellRing size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </span>
              {unread > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                  {unread} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead(currentUser.branch, isGlobal)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Mark all as read"
                >
                  <Check size={11} /> All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className={`p-1 rounded transition-colors ${isDark ? 'text-slate-600 hover:text-slate-300' : 'text-gray-300 hover:text-gray-500'}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {panelItems.length === 0 ? (
              <div className={`flex flex-col items-center gap-3 py-10 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                <Bell size={28} className="opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
                {panelItems.map(n => (
                  <NotificationItem
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

          {/* Panel footer */}
          <div className={`border-t px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/50'}`}>
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className={`w-full flex items-center justify-center gap-2 text-xs py-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-blue-400 hover:bg-blue-500/10'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              View all {visible.length} notifications
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
