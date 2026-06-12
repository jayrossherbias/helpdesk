import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import { Category, Priority, Shift, Urgency, BPO_CATEGORIES, PRIORITY_TRIGGERS, getActiveShift } from '../types';
import {
  Tag, FileText, AlertCircle, Send, Users, Clock, MapPin,
  AlertTriangle, Link2,
  Phone, Monitor, HardDrive, Wifi, KeyRound,
} from 'lucide-react';
import { HSelect } from '../components/HSelect';

// ── Category metadata ─────────────────────────────────────────
const CATEGORY_META: Record<Category, { description: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  'VoIP & Dialer Issues':         { description: 'Softphone crashes, call drops, dialer errors, Five9/Zoiper issues',       icon: Phone      },
  'CRM & Call Center Software':   { description: 'CRM login failures, frozen screens, Salesforce/Zendesk errors',           icon: Monitor    },
  'Workstation & Peripherals':    { description: 'Headsets, monitors, keyboards, desktop failures, hardware issues',        icon: HardDrive  },
  'Network & Connectivity':       { description: 'Internet outage, VPN issues, packet loss, slow connection',               icon: Wifi       },
  'Account & Access Management':  { description: 'Password resets, locked accounts, permission requests, new user setup',   icon: KeyRound   },
};

// ── Priority colour helpers ───────────────────────────────────
const PRIORITY_STYLES: Record<Priority, { badge: string; badgeLight: string; ring: string }> = {
  Critical: {
    badge:      'bg-red-500/15 text-red-400 border-red-500/30',
    badgeLight: 'bg-red-100 text-red-700 border-red-300',
    ring:       'ring-red-500/50',
  },
  High: {
    badge:      'bg-orange-500/15 text-orange-400 border-orange-500/30',
    badgeLight: 'bg-orange-100 text-orange-700 border-orange-300',
    ring:       'ring-orange-500/50',
  },
  Medium: {
    badge:      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    badgeLight: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    ring:       'ring-yellow-500/50',
  },
  Low: {
    badge:      'bg-slate-700 text-slate-300 border-slate-600',
    badgeLight: 'bg-gray-100 text-gray-600 border-gray-300',
    ring:       'ring-slate-500/50',
  },
};

const calcAutoPriority = (agents: number): Priority => {
  if (agents >= 20) return 'Critical';
  if (agents >= 5)  return 'High';
  if (agents >= 2)  return 'Medium';
  return 'Low';
};

// ─────────────────────────────────────────────────────────────
export const CreateTicket = () => {
  const { createTicket, currentUser, tickets } = useTickets();
  const isAgent = currentUser.role === 'Agent (end-user)';
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Form state
  const [title,           setTitle]           = useState('');
  const [description,     setDescription]     = useState('');
  const [category,        setCategory]        = useState<Category>('VoIP & Dialer Issues');
  const [agentsAffected,  setAgentsAffected]  = useState(1);
  const [shift,           setShift]           = useState<Shift>(getActiveShift());
  const [floor,           setFloor]           = useState('');
  const [isFloorWide,          setIsFloorWide]          = useState(false);
  const [relatedTicketNumber,  setRelatedTicketNumber]  = useState('');
  // Remembers the user's agents count before floor-wide overrides it
  const savedAgentsRef = useRef<number>(1);

  const [urgency, setUrgency] = useState<Urgency>('minor_issue');

  // Priority: auto-calculated, but user may override
  const [priorityOverride, setPriorityOverride] = useState<Priority | null>(null);
  const autoPriority  = calcAutoPriority(agentsAffected);
  const effectivePriority: Priority = priorityOverride ?? autoPriority;

  // Re-evaluate auto priority when agents change; clear override if it matches auto
  useEffect(() => {
    if (priorityOverride === calcAutoPriority(agentsAffected)) {
      setPriorityOverride(null);
    }
  }, [agentsAffected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    const ok = await createTicket(
      title, description, category, agentsAffected, shift,
      floor, isFloorWide, urgency, priorityOverride ?? undefined,
      undefined,
      relatedTicketNumber.trim() || undefined,
    );
    if (ok) navigate('/tickets');
  };

  // ── Shared style helpers ──
  const inputCls = `w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-gray-300 text-slate-900 placeholder-gray-400'}`;
  const labelCls  = `text-sm flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`;
  const cardCls   = `rounded-xl shadow-sm border p-8 space-y-6 transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Submit a Support Request</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Filed for{' '}
          <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{currentUser.branch}</span>.
          {' '}Provide accurate details — agent downtime means direct revenue impact.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cardCls}>

        {/* ── SECTION 1: CATEGORY ── */}
        <div className="space-y-3">
          <label className={`${labelCls} font-medium`}>
            <Tag size={15} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            Issue Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BPO_CATEGORIES.map(cat => {
              const meta   = CATEGORY_META[cat];
              const active = category === cat;
              return (
                <label
                  key={cat}
                  className={`flex flex-col gap-1 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    active
                      ? isDark
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : isDark
                        ? 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={active}
                    onChange={() => setCategory(cat)}
                    className="sr-only"
                  />
                  <span className="text-sm flex items-center gap-2">
                    <meta.icon size={14} className={active ? (isDark ? 'text-blue-300' : 'text-blue-500') : isDark ? 'text-slate-500' : 'text-gray-400'} />
                    {cat}
                  </span>
                  {active && (
                    <span className={`text-xs leading-snug ${isDark ? 'text-blue-300/70' : 'text-blue-500/70'}`}>
                      {meta.description}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: TITLE ── */}
        <div className="space-y-2">
          <label htmlFor="title" className={labelCls}>
            <AlertCircle size={15} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            Subject / Title
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="e.g. Softphone not connecting to dialer on Floor 2"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* ── SECTION 3: DESCRIPTION ── */}
        <div className="space-y-2">
          <label htmlFor="description" className={labelCls}>
            <FileText size={15} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            Detailed Description
            <span className={`ml-auto text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>(optional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Describe the issue in detail — include error messages, when it started, and what agents are experiencing."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* ── SECTION 4: AGENTS + SHIFT ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Agents Affected */}
          <div className="space-y-2">
            <label className={labelCls}>
              <Users size={15} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
              Number of Agents Affected
            </label>
            <input
              type="number"
              min={isFloorWide ? 20 : 1}
              value={agentsAffected}
              disabled={isFloorWide}
              onChange={e => setAgentsAffected(Math.max(1, parseInt(e.target.value) || 1))}
              className={`${inputCls} ${isFloorWide ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {isFloorWide ? (
              <p className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-orange-400/80' : 'text-orange-600'}`}>
                <AlertTriangle size={11} className="shrink-0" />
                Locked at 20+ for floor-wide incidents — your original count is restored if you uncheck.
              </p>
            ) : (
              <>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Auto-priority:{' '}
                  <span className={`font-medium px-1.5 py-0.5 rounded text-xs border ${isDark ? PRIORITY_STYLES[autoPriority].badge : PRIORITY_STYLES[autoPriority].badgeLight}`}>
                    {autoPriority}
                  </span>
                  <span className={`ml-1.5 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                    — {PRIORITY_TRIGGERS[autoPriority].trigger}
                  </span>
                </p>
                {agentsAffected >= 20 && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertTriangle size={11} />
                    Critical threshold — immediate escalation may be required
                  </p>
                )}
              </>
            )}
          </div>

          {/* Shift */}
          <div className="space-y-2">
            <label className={labelCls}>
              <Clock size={15} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
              Current Shift
            </label>
            <HSelect
              value={shift}
              onChange={v => setShift(v as Shift)}
              options={[
                { value: 'Morning',   label: 'Morning (6 AM – 2 PM)' },
                { value: 'Afternoon', label: 'Afternoon (2 PM – 10 PM)' },
                { value: 'Night',     label: 'Night (10 PM – 6 AM)' },
              ]}
              isDark={isDark}
            />
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Auto-detected from current time. Edit if reporting for a different shift.
            </p>
          </div>
        </div>

        {/* ── SECTION 8: FLOOR / TEAM ── */}
        <div className="space-y-2">
          <label className={labelCls}>
            <MapPin size={15} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            Floor / Team
          </label>
          <input
            type="text"
            placeholder="e.g. Floor 3 — Outbound Sales, Building B, Campaign: TechSupport"
            value={floor}
            onChange={e => setFloor(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* ── SECTION 9: FLOOR-WIDE TOGGLE + RELATED TICKET ── */}
        <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
          {/* Toggle row */}
          <div className="flex items-start gap-4">
            <div className="flex items-center pt-0.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsFloorWide(v => {
                    if (!v) {
                      // Turning ON: save current count, then lock to 20+
                      savedAgentsRef.current = agentsAffected;
                      setAgentsAffected(prev => Math.max(prev, 20));
                    } else {
                      // Turning OFF: restore what the user had before
                      setAgentsAffected(savedAgentsRef.current);
                      setRelatedTicketNumber('');
                    }
                    return !v;
                  });
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${isFloorWide ? 'bg-orange-500' : isDark ? 'bg-slate-700' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isFloorWide ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex-1">
              <div className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                <AlertTriangle size={14} className={isFloorWide ? 'text-orange-400' : isDark ? 'text-slate-500' : 'text-gray-400'} />
                Is this a Floor-Wide Incident?
              </div>
              <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {isFloorWide && <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
                {isFloorWide
                  ? 'Flagged as bulk incident — affecting an entire floor or campaign team.'
                  : 'Enable if this issue affects an entire floor, building, or multiple teams simultaneously.'}
              </p>
            </div>
          </div>

          {/* Related ticket dropdown — only when floor-wide is on */}
          {isFloorWide && (
            <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
              <label className={`${labelCls} text-xs`}>
                <Link2 size={13} className={isDark ? 'text-orange-400' : 'text-orange-500'} />
                Link to an Existing Related Ticket
                <span className={`ml-auto ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>(optional)</span>
              </label>
              <HSelect
                value={relatedTicketNumber}
                onChange={v => setRelatedTicketNumber(v)}
                options={[
                  { value: '', label: '— None —' },
                  ...tickets
                    .filter(t => t.ticket_number)
                    .map(t => ({
                      value: t.ticket_number!,
                      label: `${t.ticket_number} · ${t.title.length > 45 ? t.title.slice(0, 45) + '…' : t.title}`,
                    })),
                ]}
                isDark={isDark}
              />
              <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Links this ticket to an existing report of the same incident for consolidated tracking.
              </p>
            </div>
          )}
        </div>

        {/* ── SUBMIT FOOTER ── */}
        <div className={`pt-4 border-t flex items-center justify-between gap-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          {/* Summary pill */}
          <div className={`hidden sm:flex items-center gap-2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className={`px-2 py-0.5 rounded-full border ${isDark ? PRIORITY_STYLES[autoPriority].badge : PRIORITY_STYLES[autoPriority].badgeLight}`}>{autoPriority}</span>
            <span>·</span>
            <span>{agentsAffected} agent{agentsAffected !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{shift} shift</span>
            {isFloorWide && <><span>·</span><span className="text-orange-400">Floor-wide</span></>}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className={`px-5 py-2.5 text-sm rounded-lg transition-colors ${isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-gray-600 bg-gray-50 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <Send size={15} />
              Submit Ticket
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};