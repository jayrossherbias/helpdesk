import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import { shiftHandover } from '../../../api/tickets';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  AlertCircle, AlertTriangle, CheckCircle, Clock, TrendingUp,
  Building2, Globe, Zap, Ticket, Users, Timer, ShieldAlert,
  ArrowRight, Activity, ArrowUpRight, RefreshCw,
} from 'lucide-react';
import { BRANCHES, BRANCH_CONFIG, BPO_CATEGORIES, getActiveShift, Branch, SLA_HOURS, Priority, Ticket as TicketType } from '../types';

// ── Constants ─────────────────────────────────────────────────
const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'];

const SHIFT_META: Record<string, { badge: string; badgeLight: string; label: string; hours: string }> = {
  Morning:   { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    badgeLight: 'bg-amber-50 text-amber-700 border-amber-300',    label: 'Morning',   hours: '6 AM – 2 PM'   },
  Afternoon: { badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',          badgeLight: 'bg-sky-50 text-sky-700 border-sky-300',          label: 'Afternoon', hours: '2 PM – 10 PM'  },
  Night:     { badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', badgeLight: 'bg-indigo-50 text-indigo-700 border-indigo-300', label: 'Night',     hours: '10 PM – 6 AM'  },
};

const PREV_SHIFT: Record<string, string> = {
  Morning: 'Night', Afternoon: 'Morning', Night: 'Afternoon',
};

const PRIORITY_STYLE: Record<Priority, { bar: string; text: string; badge: string; badgeLight: string }> = {
  Critical: { bar: 'bg-red-500',    text: 'text-red-400',    badge: 'bg-red-500/10 text-red-400 border-red-500/20',       badgeLight: 'bg-red-100 text-red-700 border-red-200' },
  High:     { bar: 'bg-orange-500', text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', badgeLight: 'bg-orange-100 text-orange-700 border-orange-200' },
  Medium:   { bar: 'bg-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', badgeLight: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  Low:      { bar: 'bg-slate-500',  text: 'text-slate-400',  badge: 'bg-slate-800 text-slate-300 border-slate-700',          badgeLight: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// ── SLA helpers ───────────────────────────────────────────────
const getSLAStatus = (ticket: TicketType): 'Resolved' | 'On Track' | 'At Risk' | 'Breached' => {
  if (ticket.status === 'Resolved') return 'Resolved';
  const slaMs  = SLA_HOURS[ticket.priority] * 3_600_000;
  const elapsed = Date.now() - new Date(ticket.createdAt).getTime();
  const pct    = elapsed / slaMs;
  if (pct >= 1)    return 'Breached';
  if (pct >= 0.75) return 'At Risk';
  return 'On Track';
};

const calcCompliance = (tickets: TicketType[]) =>
  tickets.length > 0
    ? Math.round((tickets.filter(t => getSLAStatus(t) !== 'Breached').length / tickets.length) * 100)
    : 100;

const avgResolutionDisplay = (tickets: TicketType[]) => {
  const durations = tickets
    .filter(t => t.status === 'Resolved')
    .map(t => {
      const end   = new Date(t.resolvedAt ?? t.updatedAt).getTime();
      const start = new Date(t.createdAt).getTime();
      return isNaN(end) || isNaN(start) || end <= start ? null : end - start;
    })
    .filter((d): d is number => d !== null);
  if (!durations.length) return '—';
  const hrs = (durations.reduce((a, b) => a + b, 0) / durations.length) / 3_600_000;
  if (hrs < 1)  return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
};

const complianceColor = (pct: number) =>
  pct >= 90 ? 'text-green-400'  : pct >= 75 ? 'text-amber-400' : 'text-red-400';
const complianceBar   = (pct: number) =>
  pct >= 90 ? 'bg-green-500'    : pct >= 75 ? 'bg-amber-500'   : 'bg-red-500';


// ══════════════════════════════════════════════════════════════
//  BRANCH (Local) Dashboard
// ══════════════════════════════════════════════════════════════
const BranchDashboard = () => {
  const { tickets, currentUser } = useTickets();
  const { theme } = useTheme();
  const navigate  = useNavigate();
  const isDark    = theme === 'dark';
  const shift         = getActiveShift();
  const shiftMeta     = SHIFT_META[shift];
  const prevShift     = PREV_SHIFT[shift];
  const prevShiftMeta = SHIFT_META[prevShift];
  const queryClient = useQueryClient();

  const [showHandover, setShowHandover]     = useState(false);
  const [handoverResult, setHandoverResult] = useState<{
    reassigned_count: number; new_assignee_full_name: string; current_shift: string;
  } | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const handoverMutation = useMutation({
    mutationFn: shiftHandover,
    onSuccess: (data) => {
      setHandoverResult(data);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const mine  = tickets.filter(t => t.branch === currentUser.branch);
  const today = new Date().toDateString();

  const handoverCandidates = mine.filter(t => t.status === 'Open' || t.status === 'In Progress');
  const selectedCount = handoverCandidates.filter(t => !excludedIds.has(t.id)).length;
  const toggleHandoverTicket = (id: string) =>
    setExcludedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllHandover = () =>
    setExcludedIds(handoverCandidates.every(t => !excludedIds.has(t.id))
      ? new Set(handoverCandidates.map(t => t.id))
      : new Set());

  // ── Stat card counts ──────────────────────────────────────
  const openCount     = mine.filter(t => t.status === 'Open').length;
  const inProgCount   = mine.filter(t => t.status === 'In Progress').length;
  const pendingCount  = mine.filter(t => t.escalationStatus === 'Escalated').length;   // awaiting Main Branch
  const resolvedToday = mine.filter(t => t.status === 'Resolved' && t.resolvedAt && new Date(t.resolvedAt).toDateString() === today).length;
  const criticalOpen  = mine.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length;
  const floorWide     = mine.filter(t => t.isFloorWide && t.status !== 'Resolved');

  // ── SLA ──────────────────────────────────────────────────
  const sla           = calcCompliance(mine);
  const slaBreaches   = mine.filter(t => getSLAStatus(t) === 'Breached').length;
  const slaAtRisk     = mine.filter(t => getSLAStatus(t) === 'At Risk').length;

  const prioritySLARows = (['Critical', 'High', 'Medium', 'Low'] as Priority[]).map(p => {
    const subset = mine.filter(t => t.priority === p);
    const comp   = calcCompliance(subset);
    return { p, total: subset.length, comp };
  }).filter(r => r.total > 0);

  // ── Charts ───────────────────────────────────────────────
  const pieData = BPO_CATEGORIES.map((cat, i) => ({
    name:      cat,
    shortName: cat.split(' ')[0],
    fullName:  cat,
    value:     mine.filter(t => t.category === cat).length,
    color:     PIE_COLORS[i],
  })).filter(d => d.value > 0);

  const priorityBarData = (['Critical', 'High', 'Medium', 'Low'] as Priority[]).map(p => ({
    name:     p,
    Open:     mine.filter(t => t.priority === p && t.status === 'Open').length,
    Progress: mine.filter(t => t.priority === p && t.status === 'In Progress').length,
    Resolved: mine.filter(t => t.priority === p && t.status === 'Resolved').length,
  }));

  const card = `rounded-xl shadow-sm border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;

  return (
    <div className="space-y-6 pb-4">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`w-3 h-3 rounded-full ${(BRANCH_CONFIG[currentUser.branch] ?? { dotClass: 'bg-slate-500' }).dotClass}`} />
            <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentUser.branch} — IT Operations
            </h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Live ticket overview · Agent downtime = direct revenue loss
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Shift Badge */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium ${isDark ? shiftMeta.badge : shiftMeta.badgeLight}`}>
            <Clock size={12} />
            <span>{shiftMeta.label} Shift Active</span>
            <span className={`${isDark ? 'opacity-50' : 'opacity-60'}`}>· {shiftMeta.hours}</span>
          </div>
          {/* Critical alert badge */}
          {criticalOpen > 0 && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 text-red-400 text-xs font-medium animate-pulse">
              <AlertTriangle size={12} />
              {criticalOpen} Critical Open
            </div>
          )}
          {/* Shift Handover — supervisor only */}
          {currentUser.role === 'Branch IT Supervisor' && (
            <button
              onClick={() => { setHandoverResult(null); setExcludedIds(new Set()); setShowHandover(true); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
            >
              <RefreshCw size={12} />
              Shift Handover
            </button>
          )}
        </div>
      </div>

      {/* ── CRITICAL ALERT BANNER ── */}
      {criticalOpen > 0 && (
        <div onClick={() => navigate('/tickets?status=Open&priority=Critical')} className={`flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-opacity hover:opacity-90 ${isDark ? 'bg-red-500/5 border-red-500/25' : 'bg-red-50 border-red-200'}`}>
          <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-red-500/15' : 'bg-red-100'}`}>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
              {criticalOpen} Critical ticket{criticalOpen > 1 ? 's' : ''} require immediate attention
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400/70' : 'text-red-600/70'}`}>
              SLA window: 1 hour — potential floor-wide impact if unresolved
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full border shrink-0 ${isDark ? 'border-red-500/30 text-red-400' : 'border-red-300 text-red-600'}`}>
            Immediate Action Required
          </span>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label:     'Open Tickets',
            value:     openCount,
            sub:       `${mine.filter(t => t.priority === 'Critical' && t.status === 'Open').length} critical`,
            icon:      AlertCircle,
            darkClr:   'text-amber-400',
            darkBg:    'bg-amber-500/10',
            lightClr:  'text-amber-600',
            lightBg:   'bg-amber-100',
            accent:    isDark ? 'border-l-amber-500/40' : 'border-l-amber-400',
            href:      '/tickets?status=Open',
          },
          {
            label:     'In Progress',
            value:     inProgCount,
            sub:       `${mine.filter(t => t.priority === 'High' && t.status === 'In Progress').length} high priority`,
            icon:      Activity,
            darkClr:   'text-blue-400',
            darkBg:    'bg-blue-500/10',
            lightClr:  'text-blue-600',
            lightBg:   'bg-blue-100',
            accent:    isDark ? 'border-l-blue-500/40' : 'border-l-blue-400',
            href:      '/tickets?status=In Progress',
          },
          {
            label:     'Pending',
            value:     pendingCount,
            sub:       'awaiting Main Branch',
            icon:      ShieldAlert,
            darkClr:   'text-orange-400',
            darkBg:    'bg-orange-500/10',
            lightClr:  'text-orange-600',
            lightBg:   'bg-orange-100',
            accent:    isDark ? 'border-l-orange-500/40' : 'border-l-orange-400',
            href:      '/tickets?escalation=Escalated',
          },
          {
            label:     'Resolved Today',
            value:     resolvedToday,
            sub:       `of ${mine.filter(t => t.status === 'Resolved').length} total resolved`,
            icon:      CheckCircle,
            darkClr:   'text-green-400',
            darkBg:    'bg-green-500/10',
            lightClr:  'text-green-600',
            lightBg:   'bg-green-100',
            accent:    isDark ? 'border-l-green-500/40' : 'border-l-green-400',
            href:      '/tickets?status=Resolved',
          },
        ].map(s => (
          <div key={s.label} onClick={() => navigate(s.href)} className={`${card} p-3.5 border-l-4 ${s.accent} cursor-pointer hover:ring-1 ${isDark ? 'hover:ring-slate-700' : 'hover:ring-gray-300'} transition-shadow`}>
            <div className="flex items-start justify-between mb-2">
              <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{s.label}</p>
              <div className={`p-1.5 rounded-lg ${isDark ? s.darkBg : s.lightBg}`}>
                <s.icon size={14} className={isDark ? s.darkClr : s.lightClr} />
              </div>
            </div>
            <p className={`text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── SLA COMPLIANCE CARD ── */}
      <div className={`${card} px-5 py-4`}>
        {/* Row 1: title · status chips · overall % */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
          <h2 className={`flex items-center gap-2 text-sm shrink-0 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            <Timer size={15} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
            SLA Compliance — {shiftMeta.label} Shift
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'On Track',  count: mine.filter(t => getSLAStatus(t) === 'On Track').length,  cls: isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200' },
              { label: 'At Risk',   count: slaAtRisk,                                                cls: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Breached',  count: slaBreaches,                                              cls: isDark ? 'bg-red-500/10 text-red-400 border-red-500/20'       : 'bg-red-50 text-red-700 border-red-200' },
              { label: 'Resolved',  count: mine.filter(t => getSLAStatus(t) === 'Resolved').length,  cls: isDark ? 'bg-slate-800 text-slate-400 border-slate-700'       : 'bg-gray-100 text-gray-600 border-gray-200' },
            ].map(({ label, count, cls }) => (
              <span key={label} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cls}`}>
                {label}: <strong>{count}</strong>
              </span>
            ))}
          </div>
          <div className={`ml-auto text-2xl font-light shrink-0 ${complianceColor(sla)}`}>{sla}%</div>
        </div>

        {/* Row 2: overall progress bar */}
        <div className={`h-2 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ${complianceBar(sla)}`}
            style={{ width: `${sla}%` }}
          />
        </div>

        {/* Row 3: per-priority breakdown as a compact inline list */}
        {prioritySLARows.length > 0 && (
          <div className={`flex flex-wrap gap-x-6 gap-y-1 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            {prioritySLARows.map(({ p, total, comp }) => {
              const ps = PRIORITY_STYLE[p];
              return (
                <div key={p} className="flex items-center gap-2 min-w-[120px]">
                  <span className={`text-xs font-medium w-16 ${isDark ? ps.text : ps.text}`}>{p}</span>
                  <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                    <div className={`h-full rounded-full ${complianceBar(comp)}`} style={{ width: `${comp}%` }} />
                  </div>
                  <span className={`text-xs tabular-nums w-8 text-right ${complianceColor(comp)}`}>{comp}%</span>
                  <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>· {total} ticket{total !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FLOOR-WIDE INCIDENTS ── */}
      {floorWide.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-red-950/20 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
          {/* Section header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-red-500/15 bg-red-500/10' : 'border-red-200 bg-red-100/60'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-200'}`}>
                <AlertTriangle size={15} className="text-red-500" />
              </div>
              <div>
                <h2 className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  Active Floor-Wide Incidents
                </h2>
                <p className={`text-xs ${isDark ? 'text-red-400/60' : 'text-red-600/60'}`}>
                  Bulk grouped incidents affecting entire floors or teams
                </p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-red-200 text-red-800'}`}>
              {floorWide.length} Active
            </span>
          </div>

          {/* Incident rows */}
          <div className="divide-y divide-red-500/10">
            {floorWide.map(t => {
              const slaStatus = getSLAStatus(t);
              const slaMs     = SLA_HOURS[t.priority] * 3_600_000;
              const remaining = slaMs - (Date.now() - new Date(t.createdAt).getTime());
              const remHrs    = Math.max(0, remaining / 3_600_000);
              const ps        = PRIORITY_STYLE[t.priority];
              return (
                <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className={`flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer ${isDark ? 'hover:bg-red-500/5' : 'hover:bg-red-100/40'} transition-colors`}>
                  {/* Priority badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${isDark ? ps.badge : ps.badgeLight}`}>
                    {t.priority}
                  </span>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{t.title}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Users size={10} /> {t.agentsAffected} agents
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Clock size={10} /> {t.shift} shift
                      </span>
                      {t.floor && (
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t.floor}</span>
                      )}
                      {t.linkedIncident && (
                        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          <ArrowUpRight size={10} /> {t.linkedIncident}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SLA time remaining */}
                  <div className="flex items-center gap-2 shrink-0">
                    {slaStatus !== 'Resolved' && (
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${
                        slaStatus === 'Breached'
                          ? isDark ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200'
                          : slaStatus === 'At Risk'
                          ? isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200'
                          : isDark ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200'
                      }`}>
                        {slaStatus === 'Breached' ? 'BREACHED' : remHrs < 1 ? `${Math.round(remHrs * 60)}m left` : `${remHrs.toFixed(1)}h left`}
                      </span>
                    )}
                    <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{t.ticket_number ?? `#${t.id.slice(0, 8)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category breakdown */}
        <div className={`${card} p-6`}>
          <h2 className={`text-base mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>Tickets by Category</h2>
          <p className={`text-xs mb-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Distribution across BPO issue types
          </p>
          <div className="h-60">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    key="branch-pie"
                    data={pieData}
                    cx="50%" cy="45%"
                    innerRadius={52} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    stroke={isDark ? '#0f172a' : '#fff'}
                    strokeWidth={2}
                  >
                    {pieData.map(entry => (
                      <Cell key={`cell-${entry.fullName}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    key="pie-tooltip"
                    formatter={(val, _name, props) => [val, props.payload.fullName]}
                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e5e7eb', color: isDark ? '#f8fafc' : '#111', fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend
                    key="pie-legend"
                    formatter={value => {
                      const e = pieData.find(d => d.name === value);
                      return e ? e.shortName : value;
                    }}
                    wrapperStyle={{ color: isDark ? '#94a3b8' : '#374151', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`flex items-center justify-center h-full text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                No ticket data yet
              </div>
            )}
          </div>
        </div>

        {/* Priority breakdown bar */}
        <div className={`${card} p-6`}>
          <h2 className={`text-base mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>Tickets by Priority</h2>
          <p className={`text-xs mb-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Open · In Progress · Resolved per priority level
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid key="branch-bar-grid"   strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f3f4f6'} />
                <XAxis         key="branch-bar-xaxis"  dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 12 }} />
                <YAxis         key="branch-bar-yaxis"  axisLine={false} tickLine={false} tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 12 }} />
                <Tooltip       key="branch-bar-tip"    cursor={{ fill: isDark ? '#1e293b' : '#f9fafb' }} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e5e7eb', fontSize: 12, borderRadius: 8 }} />
                <Legend        key="branch-bar-legend" wrapperStyle={{ color: isDark ? '#94a3b8' : '#374151', fontSize: 12 }} />
                <Bar key="branch-bar-open"     dataKey="Open"     fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar key="branch-bar-progress" dataKey="Progress" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar key="branch-bar-resolved" dataKey="Resolved" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── RECENT HIGH-PRIORITY TICKETS ── */}
      {mine.filter(t => (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Resolved').length > 0 && (
        <div className={`${card} overflow-hidden`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            <h2 className={`text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Zap size={15} className="text-amber-400" /> High-Priority Open Tickets
            </h2>
          </div>
          <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-50'}`}>
            {mine
              .filter(t => (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Resolved')
              .slice(0, 5)
              .map(t => {
                const slaStatus = getSLAStatus(t);
                const ps        = PRIORITY_STYLE[t.priority];
                return (
                  <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'} transition-colors`}>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${isDark ? ps.badge : ps.badgeLight}`}>
                      {t.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{t.title}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {t.category} · {t.agentsAffected} agents · {t.shift} shift
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        slaStatus === 'Breached' ? (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-700 border-red-200') :
                        slaStatus === 'At Risk'  ? (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-700 border-amber-200') :
                                                   (isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-100 text-green-700 border-green-200')
                      }`}>
                        SLA: {slaStatus}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{t.ticket_number ?? `#${t.id.slice(0, 8)}`}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── SHIFT HANDOVER MODAL ── */}
      {showHandover && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>

            {!handoverResult ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2.5 rounded-xl ${isDark ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
                    <RefreshCw size={18} className="text-sky-400" />
                  </div>
                  <div>
                    <h2 className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Shift Handover</h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Transfer tickets from {prevShiftMeta.label} to {shiftMeta.label} shift
                    </p>
                  </div>
                </div>

                {/* Shift info */}
                <div className={`rounded-xl border p-4 mb-4 space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Outgoing shift</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${isDark ? prevShiftMeta.badge : prevShiftMeta.badgeLight}`}>
                      {prevShiftMeta.label} · {prevShiftMeta.hours}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Taking over</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${isDark ? shiftMeta.badge : shiftMeta.badgeLight}`}>
                      {shiftMeta.label} · {shiftMeta.hours}
                    </span>
                  </div>
                </div>

                {/* Ticket selection */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Tickets to transfer
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-700'}`}>
                        {selectedCount} of {handoverCandidates.length}
                      </span>
                    </span>
                    {handoverCandidates.length > 0 && (
                      <button
                        onClick={toggleAllHandover}
                        className={`text-[11px] underline underline-offset-2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-700'}`}
                      >
                        {handoverCandidates.every(t => !excludedIds.has(t.id)) ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>

                  {handoverCandidates.length === 0 ? (
                    <div className={`rounded-lg border px-4 py-6 text-center text-xs ${isDark ? 'border-slate-800 text-slate-600' : 'border-gray-200 text-gray-400'}`}>
                      No open or in-progress tickets to hand over.
                    </div>
                  ) : (
                    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                      <div className="max-h-52 overflow-y-auto">
                        {handoverCandidates.map((t, i) => {
                          const isIncluded = !excludedIds.has(t.id);
                          const ps = PRIORITY_STYLE[t.priority];
                          return (
                            <label
                              key={t.id}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                i > 0 ? (isDark ? 'border-t border-slate-800' : 'border-t border-gray-100') : ''
                              } ${isIncluded
                                  ? isDark ? 'bg-slate-950 hover:bg-slate-900' : 'bg-white hover:bg-gray-50'
                                  : isDark ? 'bg-slate-900/40 hover:bg-slate-900' : 'bg-gray-50/60 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleHandoverTicket(t.id)}
                                className="accent-sky-500 w-3.5 h-3.5 shrink-0"
                              />
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${isDark ? ps.badge : ps.badgeLight}`}>
                                {t.priority.toUpperCase()}
                              </span>
                              <span className={`text-xs font-mono shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                {t.ticket_number ?? t.id.slice(0, 8)}
                              </span>
                              <span className={`text-xs truncate flex-1 ${isIncluded ? (isDark ? 'text-slate-200' : 'text-gray-800') : (isDark ? 'text-slate-600 line-through' : 'text-gray-400 line-through')}`}>
                                {t.title}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Checked tickets will be reassigned to the least-loaded {shiftMeta.label} shift technician. Unchecked tickets stay with their current assignee.
                </p>

                {handoverMutation.isError && (
                  <p className={`text-xs mb-3 px-3 py-2 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    {(handoverMutation.error as any)?.response?.data?.detail ?? 'Handover failed. Please try again.'}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handoverMutation.mutate(Array.from(excludedIds))}
                    disabled={handoverMutation.isPending || selectedCount === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
                  >
                    <RefreshCw size={13} className={handoverMutation.isPending ? 'animate-spin' : ''} />
                    {handoverMutation.isPending ? 'Transferring…' : `Transfer ${selectedCount} Ticket${selectedCount !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => setShowHandover(false)}
                    className={`px-4 py-2.5 rounded-lg text-sm transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2.5 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                    <CheckCircle size={18} className="text-green-400" />
                  </div>
                  <div>
                    <h2 className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Handover Complete</h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{shiftMeta.label} shift has taken over from {prevShiftMeta.label}</p>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 mb-5 space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tickets transferred</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{handoverResult.reassigned_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Now assigned to</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{handoverResult.new_assignee_full_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Shift</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${isDark ? shiftMeta.badge : shiftMeta.badgeLight}`}>
                      {handoverResult.current_shift.charAt(0).toUpperCase() + handoverResult.current_shift.slice(1)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowHandover(false)}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};


// ══════════════════════════════════════════════════════════════
//  MAIN BRANCH — Global Cross-Branch Dashboard
// ══════════════════════════════════════════════════════════════
const GlobalDashboard = () => {
  const { tickets, currentUser } = useTickets();
  const { theme }  = useTheme();
  const navigate   = useNavigate();
  const isDark     = theme === 'dark';
  const shift      = getActiveShift();
  const shiftMeta  = SHIFT_META[shift];

  const [hoveredBranch, setHoveredBranch] = useState<Branch | null>(null);

  // ── Global aggregates ─────────────────────────────────────
  const totalOpen      = tickets.filter(t => t.status === 'Open').length;
  const totalCritical  = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length;
  const totalEscalated = tickets.filter(t => t.escalationStatus === 'Escalated' && t.status !== 'Resolved').length;

  // ── Per-branch stats ──────────────────────────────────────
  const branchStats = (BRANCHES.filter(b => b !== 'Main Branch') as Branch[]).map(b => {
    const bt        = tickets.filter(t => t.branch === b);
    const open      = bt.filter(t => t.status === 'Open').length;
    const inProg    = bt.filter(t => t.status === 'In Progress').length;
    const escalated = bt.filter(t => t.escalationStatus === 'Escalated' && t.status !== 'Resolved').length;
    const compliance= calcCompliance(bt);
    const avgRes    = avgResolutionDisplay(bt);
    const critical  = bt.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length;
    const cfg       = BRANCH_CONFIG[b] ?? { dotClass: 'bg-slate-500', color: '#64748b', label: b };
    return { b, bt, open, inProg, escalated, compliance, avgRes, critical, cfg };
  });

  // ── Bar chart data ────────────────────────────────────────
  const barData = branchStats.map(s => ({
    name:       s.b.replace(' Branch', ''),
    'Open':     s.open,
    'In Progress': s.inProg,
    'Escalated':s.escalated,
    'Resolved': s.bt.filter(t => t.status === 'Resolved').length,
  }));

  // ── Global SLA ────────────────────────────────────────────
  const globalSLA = calcCompliance(tickets);

  const card = `rounded-xl shadow-sm border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;

  return (
    <div className="space-y-6 pb-4">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Globe size={20} className="text-blue-400" />
            <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Cross-Branch Overview</h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Main Branch IT Manager · All 4 branches visible · Global incident view
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium ${isDark ? shiftMeta.badge : shiftMeta.badgeLight}`}>
            <Clock size={12} />
            <span>{shiftMeta.label} Shift Active</span>
            <span className="opacity-50">· {shiftMeta.hours}</span>
          </div>
          {totalCritical > 0 && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 text-red-400 text-xs font-medium animate-pulse">
              <AlertTriangle size={12} /> {totalCritical} Critical Systemwide
            </div>
          )}
        </div>
      </div>

      {/* ── 3 GLOBAL STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label:   'Total Open Across All Branches',
            value:   totalOpen,
            sub:     `${totalCritical} critical · ${tickets.filter(t => t.priority === 'High' && t.status !== 'Resolved').length} high`,
            icon:    Ticket,
            darkClr: 'text-amber-400', darkBg:  'bg-amber-500/10',
            lightClr:'text-amber-600', lightBg: 'bg-amber-100',
            accent:  isDark ? 'border-l-amber-500/40' : 'border-l-amber-400',
            href:    '/tickets?status=Open',
          },
          {
            label:   'Critical Tickets Systemwide',
            value:   totalCritical,
            sub:     `${tickets.filter(t => t.priority === 'Critical' && t.isFloorWide).length} floor-wide · immediate SLA`,
            icon:    AlertTriangle,
            darkClr: 'text-red-400',    darkBg:  'bg-red-500/10',
            lightClr:'text-red-600',    lightBg: 'bg-red-100',
            accent:  isDark ? 'border-l-red-500/40' : 'border-l-red-400',
            href:    '/tickets?priority=Critical',
          },
          {
            label:   'Escalations Pending',
            value:   totalEscalated,
            sub:     `${tickets.filter(t => t.escalationStatus === 'Resolved by Main Branch').length} resolved by Main Branch`,
            icon:    ShieldAlert,
            darkClr: 'text-orange-400', darkBg:  'bg-orange-500/10',
            lightClr:'text-orange-600', lightBg: 'bg-orange-100',
            accent:  isDark ? 'border-l-orange-500/40' : 'border-l-orange-400',
            href:    '/tickets?escalation=Escalated',
          },
        ].map(s => (
          <div key={s.label} onClick={() => navigate(s.href)} className={`${card} p-5 border-l-4 ${s.accent} cursor-pointer hover:ring-1 ${isDark ? 'hover:ring-slate-700' : 'hover:ring-gray-300'} transition-shadow`}>
            <div className="flex items-start justify-between mb-4">
              <p className={`text-xs uppercase tracking-wider leading-tight max-w-[140px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{s.label}</p>
              <div className={`p-2 rounded-lg shrink-0 ${isDark ? s.darkBg : s.lightBg}`}>
                <s.icon size={16} className={isDark ? s.darkClr : s.lightClr} />
              </div>
            </div>
            <p className={`text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
            <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── GLOBAL SLA COMPLIANCE BAR ── */}
      <div className={`${card} px-6 py-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Timer size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Global SLA Compliance — All Branches
            </span>
          </div>
          <span className={`text-sm font-medium ${complianceColor(globalSLA)}`}>{globalSLA}%</span>
        </div>
        <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ${complianceBar(globalSLA)}`}
            style={{ width: `${globalSLA}%` }}
          />
        </div>
        <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
          Target ≥ 90% ·{' '}
          {tickets.filter(t => getSLAStatus(t) === 'Breached').length} total breach(es) ·{' '}
          {tickets.filter(t => getSLAStatus(t) === 'At Risk').length} at risk
        </p>
      </div>

      {/* ── BRANCH COMPARISON TABLE ── */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h2 className={`text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            <Building2 size={17} className="text-blue-400" /> Branch Comparison
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Click a row to highlight · Data refreshes in real time
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                {[
                  { label: 'Branch Name',       cls: 'w-44' },
                  { label: 'Open Tickets',       cls: 'w-32' },
                  { label: 'SLA Compliance %',   cls: 'w-48' },
                  { label: 'Avg Resolution Time',cls: 'w-44' },
                  { label: 'Escalated Tickets',  cls: 'w-36' },
                ].map(h => (
                  <th key={h.label} className={`py-3.5 px-5 text-left text-xs uppercase tracking-wider ${h.cls} ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-50'}`}>
              {branchStats.map(({ b, open, compliance, avgRes, escalated, critical, cfg }) => {
                const isHovered = hoveredBranch === b;
                return (
                  <tr
                    key={b}
                    onClick={() => navigate(`/tickets?branch=${encodeURIComponent(b)}`)}
                    onMouseEnter={() => setHoveredBranch(b)}
                    onMouseLeave={() => setHoveredBranch(null)}
                    className={`cursor-pointer transition-colors ${
                      isHovered
                        ? isDark ? 'bg-slate-800' : 'bg-blue-50'
                        : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Branch Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{b}</span>
                      </div>
                    </td>

                    {/* Open Tickets */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-base ${open > 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-500' : 'text-gray-400')}`}>
                          {open}
                        </span>
                        {critical > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                            {critical} crit
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SLA Compliance % */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex-1 h-2 rounded-full overflow-hidden max-w-[90px] ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                          <div
                            className={`h-full rounded-full transition-all ${complianceBar(compliance)}`}
                            style={{ width: `${compliance}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium tabular-nums ${complianceColor(compliance)}`}>
                          {compliance}%
                        </span>
                        {compliance < 75 && (
                          <AlertTriangle size={13} className="text-red-400 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Avg Resolution Time */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
                        <span className={`font-medium ${avgRes === '—' ? (isDark ? 'text-slate-600' : 'text-gray-300') : (isDark ? 'text-slate-200' : 'text-gray-800')}`}>
                          {avgRes}
                        </span>
                        {avgRes !== '—' && (
                          <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>avg</span>
                        )}
                      </div>
                    </td>

                    {/* Escalated Tickets */}
                    <td className="py-4 px-5">
                      {escalated > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20 font-medium">
                            {escalated} pending
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer: global summary row */}
        <div className={`flex flex-wrap items-center gap-6 px-5 py-3.5 border-t ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/50'}`}>
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            All branches · {tickets.length} tickets total
          </span>
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Global avg resolution: <strong className={isDark ? 'text-slate-300' : 'text-gray-700'}>{avgResolutionDisplay(tickets)}</strong>
          </span>
          <span className={`text-xs ${complianceColor(globalSLA)}`}>
            Global SLA: <strong>{globalSLA}%</strong>
          </span>
        </div>
      </div>

      {/* ── BAR CHART: TICKET VOLUME BY BRANCH ── */}
      <div className={`${card} p-6`}>
        <h2 className={`text-base mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>Ticket Volume by Branch</h2>
        <p className={`text-xs mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          Open · In Progress · Escalated · Resolved across all branches
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid key="global-bar-grid"   strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f3f4f6'} />
              <XAxis
                key="global-bar-xaxis"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 12 }}
              />
              <YAxis
                key="global-bar-yaxis"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 12 }}
              />
              <Tooltip
                key="global-bar-tip"
                cursor={{ fill: isDark ? '#1e293b' : '#f9fafb' }}
                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e5e7eb', fontSize: 12, borderRadius: 8 }}
              />
              <Legend key="global-bar-legend" wrapperStyle={{ color: isDark ? '#94a3b8' : '#374151', fontSize: 12 }} />
              <Bar key="global-bar-open"       dataKey="Open"        fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar key="global-bar-inprogress" dataKey="In Progress" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar key="global-bar-escalated"  dataKey="Escalated"   fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar key="global-bar-resolved"   dataKey="Resolved"    fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── ESCALATED TICKETS PANEL ── */}
      {totalEscalated > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-orange-500/15 bg-orange-500/10' : 'border-orange-200 bg-orange-100/60'}`}>
            <div className="flex items-center gap-2.5">
              <Zap size={15} className="text-orange-500" />
              <div>
                <h2 className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                  Escalated Tickets — Awaiting Main Branch Resolution
                </h2>
                <p className={`text-xs ${isDark ? 'text-orange-400/60' : 'text-orange-600/60'}`}>
                  These tickets have been escalated from branch IT and require your attention
                </p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' : 'bg-orange-200 text-orange-800'}`}>
              {totalEscalated} Pending
            </span>
          </div>
          <div className={`divide-y ${isDark ? 'divide-orange-500/10' : 'divide-orange-100'}`}>
            {tickets.filter(t => t.escalationStatus === 'Escalated' && t.status !== 'Resolved').map(t => {
              const ps  = PRIORITY_STYLE[t.priority];
              const cfg = BRANCH_CONFIG[t.branch] ?? { dotClass: 'bg-slate-500', color: '#64748b', label: t.branch };
              return (
                <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className={`flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer ${isDark ? 'hover:bg-orange-500/5' : 'hover:bg-orange-100/30'} transition-colors`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotClass}`} title={t.branch} />
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${isDark ? ps.badge : ps.badgeLight}`}>{t.priority}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{t.title}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {t.branch} · {t.agentsAffected} agents · {t.shift} shift · {t.category}
                    </p>
                  </div>
                  <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{t.ticket_number ?? `#${t.id.slice(0, 8)}`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


// ══════════════════════════════════════════════════════════════
//  Root export — routes by role
// ══════════════════════════════════════════════════════════════
export const Dashboard = () => {
  const { currentUser } = useTickets();

  if (currentUser.role === 'Agent (end-user)') {
    return <Navigate to="/tickets" replace />;
  }

  const isGlobal =
    currentUser.role === 'Main Branch IT Manager' ||
    currentUser.role === 'Main Branch IT Supervisor' ||
    (currentUser.role === 'Branch IT Supervisor' && currentUser.branch === 'Main Branch');
  return isGlobal ? <GlobalDashboard /> : <BranchDashboard />;
};