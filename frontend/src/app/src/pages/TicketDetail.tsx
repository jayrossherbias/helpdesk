import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import { Status, Priority, SLA_HOURS, BRANCH_CONFIG } from '../types';
import {
  ArrowLeft, Clock, User, Tag, FileText, Activity,
  AlertTriangle, Zap, Building2, Users, Timer, MapPin,
  CheckCircle2, Link2, ShieldAlert,
} from 'lucide-react';
import { HSelect } from '../components/HSelect';

// ── SLA helpers ───────────────────────────────────────────────
const SLA_MS: Record<Priority, number> = {
  Critical: SLA_HOURS.Critical * 3600000,
  High:     SLA_HOURS.High    * 3600000,
  Medium:   SLA_HOURS.Medium  * 3600000,
  Low:      SLA_HOURS.Low     * 3600000,
};

const formatDuration = (ms: number) => {
  if (ms <= 0) return 'BREACHED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m remaining`;
  return `${h}h ${m}m remaining`;
};

// ── Shift badge colours ────────────────────────────────────────
const SHIFT_BADGE: Record<string, string> = {
  Morning:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Afternoon: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Night:     'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};
const SHIFT_BADGE_LIGHT: Record<string, string> = {
  Morning:   'bg-amber-100 text-amber-700 border-amber-300',
  Afternoon: 'bg-sky-100 text-sky-700 border-sky-300',
  Night:     'bg-indigo-100 text-indigo-700 border-indigo-300',
};

// ─────────────────────────────────────────────────────────────
export const TicketDetail = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { tickets, currentUser, updateTicketStatus, updateTicketPriority, assignTicket, escalateTicket, resolveEscalation } = useTickets();
  const { theme }    = useTheme();
  const isDark       = theme === 'dark';

  const ticket = tickets.find(t => t.id === id);

  const [now,              setNow]              = useState(Date.now());
  const [escalationNotes,  setEscalationNotes]  = useState('');
  const [showEscalateForm, setShowEscalateForm] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <h2 className={`text-xl ${isDark ? 'text-white' : 'text-gray-700'}`}>Ticket not found</h2>
        <button onClick={() => navigate('/tickets')} className="text-blue-500 hover:underline flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Back to Tickets
        </button>
      </div>
    );
  }

  // ── Roles ────────────────────────────────────────────────────
  const canManage    = currentUser.role !== 'Agent (end-user)';
  const canReassign  = currentUser.role === 'Branch IT Supervisor' || currentUser.role === 'Main Branch IT Manager';
  const isBranchIT   = currentUser.role === 'Branch IT Technician' ||
                       (currentUser.role === 'Branch IT Supervisor' && currentUser.branch !== 'Main Branch');
  const isMainOrAdmin = (currentUser.role === 'Branch IT Supervisor' && currentUser.branch === 'Main Branch') ||
                         currentUser.role === 'Main Branch IT Manager';

  const branchCfg = BRANCH_CONFIG[ticket.branch];

  // ── SLA ──────────────────────────────────────────────────────
  const slaMs        = SLA_MS[ticket.priority];
  const elapsed      = now - new Date(ticket.createdAt).getTime();
  const remaining    = slaMs - elapsed;
  const pctUsed      = Math.min(100, (elapsed / slaMs) * 100);
  const pctRemaining = Math.max(0, 100 - pctUsed);
  const slaBreached  = remaining <= 0 && ticket.status !== 'Resolved';
  const slaAtRisk    = !slaBreached && pctRemaining < 25;
  const slaOnTrack   = !slaBreached && !slaAtRisk;

  // ── Priority badge ───────────────────────────────────────────
  const getPriorityBadge = (p: Priority) => {
    if (isDark) switch (p) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'High':     return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Medium':   return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Low':      return 'bg-slate-800 text-slate-300 border-slate-700';
    }
    switch (p) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High':     return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':   return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':      return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (s: Status) => {
    if (isDark) switch (s) {
      case 'Open':        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'In Progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Resolved':    return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
    switch (s) {
      case 'Open':        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved':    return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const cardBase = `rounded-xl shadow-sm border p-6 transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;

  const handleEscalate = () => {
    if (!escalationNotes.trim()) return;
    escalateTicket(ticket.id, escalationNotes);
    setShowEscalateForm(false);
    setEscalationNotes('');
  };

  // ── Escalation badge colour ───────────────────────────────────
  const escalationBadge = () => {
    switch (ticket.escalationStatus) {
      case 'Escalated':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
      case 'Resolved by Main Branch':
        return 'bg-green-500/15 text-green-400 border-green-500/20';
      default:
        return isDark
          ? 'bg-slate-800 text-slate-400 border-slate-700'
          : 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <button
        onClick={() => navigate('/tickets')}
        className={`flex items-center gap-2 text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-900'}`}
      >
        <ArrowLeft size={16} /> Back to Tickets
      </button>

      <div className="flex flex-col md:flex-row gap-6">

        {/* ══════════════════════════════════════════════════════
            LEFT / MAIN CONTENT
        ══════════════════════════════════════════════════════ */}
        <div className="flex-1 space-y-5">

          {/* ── Ticket header card ── */}
          <div className={cardBase}>
            <div className={`flex items-start gap-3 mb-6 border-b pb-5 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`p-3 rounded-xl shrink-0 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <FileText size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {ticket.isFloorWide && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
                      <AlertTriangle size={11} /> Floor-Wide
                    </span>
                  )}
                  <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <Building2 size={11} />
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${branchCfg.dotClass}`} />
                    {ticket.branch}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityBadge(ticket.priority)}`}>{ticket.priority}</span>
                </div>
                <h1 className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{ticket.title}</h1>
                <p className={`text-sm flex items-center gap-2 mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Ticket{' '}
                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>#{ticket.id}</span>
                  <span className={`mx-1 ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>·</span>
                  Created {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className={`prose prose-sm max-w-none mb-6 whitespace-pre-wrap text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {ticket.description}
            </div>

            {/* Meta grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              {[
                { label: 'Requester',        icon: User,      value: ticket.creator },
                { label: 'Agents Affected',  icon: Users,     value: `${ticket.agentsAffected} agent${ticket.agentsAffected !== 1 ? 's' : ''}` },
                { label: 'Shift',            icon: Clock,     value: ticket.shift },
                { label: 'Floor / Team',     icon: MapPin,    value: ticket.floor || '—' },
                { label: 'Category',         icon: Tag,       value: ticket.category },
                { label: 'Assignee',         icon: User,      value: ticket.assignee },
                { label: 'Created',          icon: Clock,     value: new Date(ticket.createdAt).toLocaleDateString() },
                { label: 'Branch',           icon: Building2, value: ticket.branch },
              ].map(item => (
                <div key={item.label}>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{item.label}</p>
                  <p className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                    <item.icon size={13} className={isDark ? 'text-slate-500 shrink-0' : 'text-gray-400 shrink-0'} />
                    <span className="truncate">{item.value}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Linked Incident */}
            {ticket.linkedIncident && (
              <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                <Link2 size={14} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
                <span className={isDark ? 'text-slate-500' : 'text-gray-500'}>Linked Incident:</span>
                <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{ticket.linkedIncident}</span>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              ESCALATION SECTION
          ══════════════════════════════════════════════════ */}
          <div className={`rounded-xl border p-5 transition-colors duration-200 ${
            ticket.escalationStatus === 'Escalated'
              ? isDark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'
              : ticket.escalationStatus === 'Resolved by Main Branch'
              ? isDark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200'
              : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
          }`}>

            {/* Section header */}
            <h2 className={`text-sm mb-4 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-gray-800'}`}>
              <ShieldAlert size={16} className="text-orange-400" />
              Escalation
            </h2>

            {/* Status badge row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${escalationBadge()}`}>
                {ticket.escalationStatus === 'Escalated' ? (
                  <><Zap size={11} className="shrink-0" /> Escalated to Main Branch</>
                ) : ticket.escalationStatus === 'Resolved by Main Branch' ? (
                  <><CheckCircle2 size={11} className="shrink-0" /> Resolved by Main Branch</>
                ) : (
                  <>— Not Escalated</>
                )}
              </span>
              {ticket.escalatedAt && (
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  <Clock size={11} className="inline mr-1" />
                  {new Date(ticket.escalatedAt).toLocaleString()}
                </span>
              )}
            </div>

            {/* Escalation notes */}
            {ticket.escalationNotes && (
              <div className={`text-sm p-3 rounded-lg border mb-4 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className={`block text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Escalation Notes
                </span>
                {ticket.escalationNotes}
              </div>
            )}

            {/* ── Branch IT: Escalate button ── */}
            {isBranchIT && ticket.status !== 'Resolved' && (
              <>
                {ticket.escalationStatus === 'Not Escalated' ? (
                  <>
                    {!showEscalateForm ? (
                      <button
                        onClick={() => setShowEscalateForm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                      >
                        <Zap size={14} /> Escalate to Main Branch
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          Describe why Main Branch intervention is required:
                        </p>
                        <textarea
                          rows={3}
                          value={escalationNotes}
                          onChange={e => setEscalationNotes(e.target.value)}
                          placeholder="e.g. Issue is beyond branch-level resolution. 28 agents down, VoIP vendor contacted. Need Main Branch support."
                          className={`w-full px-4 py-2.5 border rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-orange-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900'}`}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleEscalate}
                            disabled={!escalationNotes.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                          >
                            <Zap size={14} /> Confirm Escalation
                          </button>
                          <button
                            onClick={() => { setShowEscalateForm(false); setEscalationNotes(''); }}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Already escalated — show disabled state */
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-600/40 text-orange-300 cursor-not-allowed"
                  >
                    <Zap size={14} />
                    {ticket.escalationStatus === 'Escalated' ? 'Already Escalated' : 'Escalation Resolved'}
                  </button>
                )}
              </>
            )}

            {/* ── Main Branch: Resolve escalation ── */}
            {isMainOrAdmin && ticket.escalationStatus === 'Escalated' && (
              <button
                onClick={() => resolveEscalation(ticket.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <CheckCircle2 size={14} /> Mark Escalation Resolved
              </button>
            )}
          </div>

          {/* ── Activity History ── */}
          <div className={cardBase}>
            <h2 className={`text-base mb-5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Activity size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Ticket History
            </h2>
            <div className="space-y-5">
              {ticket.history.map(hist => (
                <div key={hist.id} className={`relative pl-6 pb-5 last:pb-0 border-l-2 last:border-transparent ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                  <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDark ? 'bg-blue-900/50 border-slate-900' : 'bg-blue-100 border-white'}`}>
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{hist.action}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {new Date(hist.timestamp).toLocaleString()} · by {hist.actor}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            RIGHT PANEL
        ══════════════════════════════════════════════════════ */}
        <div className="w-full md:w-72 space-y-5">

          {/* ── SLA Timer ── */}
          <div className={`rounded-xl border p-5 transition-colors duration-200 ${
            slaBreached ? (isDark ? 'bg-red-500/5 border-red-500/30' : 'bg-red-50 border-red-300')
            : slaAtRisk  ? (isDark ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50 border-amber-300')
            : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-xs uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Timer size={13} /> SLA Timer
            </h3>

            {ticket.status === 'Resolved' ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>Resolved within SLA</p>
              </div>
            ) : (
              <>
                {/* Time remaining */}
                <p className={`text-sm font-medium mb-2 ${slaBreached ? 'text-red-400' : slaAtRisk ? 'text-amber-400' : isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                  {slaBreached ? (
                    <span className="inline-flex items-center gap-1.5"><AlertTriangle size={14} /> SLA BREACHED</span>
                  ) : formatDuration(remaining)}
                </p>

                {/* Progress bar — only shown when NOT breached (at 100% it's just a red stripe) */}
                {!slaBreached && (
                  <div className={`h-2.5 rounded-full overflow-hidden mb-2 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        slaAtRisk ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                )}

                {/* Breached: pulsing badge strip instead of a bar */}
                {slaBreached && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-2 animate-pulse ${
                    isDark
                      ? 'bg-red-500/10 border-red-500/25 text-red-400'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs font-medium">SLA window exceeded · {formatDuration(Math.abs(remaining))} over</span>
                  </div>
                )}

                {/* Percentage label */}
                <p className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {slaBreached
                    ? 'SLA window has passed'
                    : `${Math.round(pctUsed)}% elapsed · ${Math.round(pctRemaining)}% remaining`}
                </p>

                {/* SLA window detail */}
                <div className={`text-xs space-y-0.5 pt-2 mt-2 border-t ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-400'}`}>
                  <p>Priority: <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{ticket.priority}</span></p>
                  <p>SLA window: <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{SLA_HOURS[ticket.priority]}h</span></p>
                  {slaAtRisk && !slaBreached && (
                    <p className="text-amber-400 flex items-center gap-1 mt-1">
                      <AlertTriangle size={10} /> Under 25% time left
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Incident Details (read-only) ── */}
          <div className={cardBase}>
            <h3 className={`text-xs uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Incident Details
            </h3>
            <div className="space-y-3">

              {/* Shift */}
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Shift</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border font-medium ${
                  isDark ? SHIFT_BADGE[ticket.shift] : SHIFT_BADGE_LIGHT[ticket.shift]
                }`}>
                  <Clock size={11} />
                  {ticket.shift} Shift
                </span>
              </div>

              {/* Agents Affected */}
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Agents Affected</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border font-medium ${
                    ticket.agentsAffected >= 20
                      ? isDark ? 'bg-red-500/15 text-red-400 border-red-500/30'    : 'bg-red-100 text-red-700 border-red-300'
                      : ticket.agentsAffected >= 5
                      ? isDark ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-700 border-orange-300'
                      : ticket.agentsAffected >= 2
                      ? isDark ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                      : isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}>
                    <Users size={11} />
                    {ticket.agentsAffected} agent{ticket.agentsAffected !== 1 ? 's' : ''}
                  </span>
                  {ticket.isFloorWide && (
                    <span className={`text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                      Floor-wide
                    </span>
                  )}
                </div>
              </div>

              {/* Floor */}
              {ticket.floor && (
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Floor / Team</p>
                  <p className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <MapPin size={12} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                    {ticket.floor}
                  </p>
                </div>
              )}

              {/* Linked Incident */}
              {ticket.linkedIncident && (
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Linked Incident</p>
                  <p className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    <Link2 size={12} />
                    {ticket.linkedIncident}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Properties (editable) ── */}
          <div className={cardBase}>
            <h3 className={`text-xs uppercase tracking-wider mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Properties</h3>
            <div className="space-y-4">

              {/* Status */}
              <div>
                <label className={`text-xs uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Status</label>
                {canManage ? (
                  <HSelect
                    value={ticket.status}
                    onChange={v => updateTicketStatus(ticket.id, v as Status)}
                    options={[
                      { value: 'Open',        label: 'Open' },
                      { value: 'In Progress', label: 'In Progress' },
                      { value: 'Resolved',    label: 'Resolved' },
                    ]}
                    isDark={isDark}
                    className="w-full"
                    triggerClassName={`${getStatusBadge(ticket.status)} hover:brightness-110`}
                  />
                ) : (
                  <span className={`inline-flex px-3 py-1.5 text-sm rounded-lg border ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className={`text-xs uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Priority</label>
                {canManage ? (
                  <HSelect
                    value={ticket.priority}
                    onChange={v => updateTicketPriority(ticket.id, v as Priority)}
                    options={[
                      { value: 'Critical', label: 'Critical' },
                      { value: 'High',     label: 'High' },
                      { value: 'Medium',   label: 'Medium' },
                      { value: 'Low',      label: 'Low' },
                    ]}
                    isDark={isDark}
                    className="w-full"
                    triggerClassName={`${getPriorityBadge(ticket.priority)} hover:brightness-110`}
                  />
                ) : (
                  <span className={`inline-flex px-3 py-1.5 text-sm rounded-lg border ${getPriorityBadge(ticket.priority)}`}>{ticket.priority}</span>
                )}
              </div>

              {/* Assignee */}
              {canReassign && (
                <div>
                  <label className={`text-xs uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Assign To</label>
                  <HSelect
                    value={ticket.assignee}
                    onChange={v => assignTicket(ticket.id, v)}
                    options={[
                      { value: 'Unassigned',        label: 'Unassigned' },
                      { value: 'VoIP Team',          label: 'VoIP Team' },
                      { value: 'CRM Team',           label: 'CRM Team' },
                      { value: 'Workstation Team',   label: 'Workstation Team' },
                      { value: 'Network Team',       label: 'Network Team' },
                      { value: 'Account Team',       label: 'Account Team' },
                    ]}
                    isDark={isDark}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

        </div>
        {/* end right panel */}
      </div>
    </div>
  );
};