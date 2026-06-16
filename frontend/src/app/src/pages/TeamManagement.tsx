import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, Users, Clock, AlertTriangle,
  Sun, Sunset, Moon, UserCheck, UserX, CheckCircle2, Minus, Loader2,
} from 'lucide-react';
import { BRANCHES, BRANCH_CONFIG, getActiveShift } from '../types';
import { toast } from 'sonner';
import { HSelect } from '../components/HSelect';
import { getUsers, updateUserShift } from '../../../api/accounts';
import type { UserProfile } from '../../../api/auth';

type ShiftKey = 'Morning' | 'Afternoon' | 'Night';

const SHIFTS: ShiftKey[] = ['Morning', 'Afternoon', 'Night'];
const bpoTeams = ['VoIP Team', 'CRM Team', 'Workstation Team', 'Network Team', 'Account Team'];

const API_SHIFT_TO_KEY: Record<string, ShiftKey> = {
  morning: 'Morning', afternoon: 'Afternoon', night: 'Night',
};
const SHIFT_KEY_TO_API: Record<ShiftKey, string> = {
  Morning: 'morning', Afternoon: 'afternoon', Night: 'night',
};

const FIGMA_CATEGORY_TO_TEAM: Record<string, string> = {
  'VoIP & Dialer Issues':        'VoIP Team',
  'CRM & Call Center Software':  'CRM Team',
  'Workstation & Peripherals':   'Workstation Team',
  'Network & Connectivity':      'Network Team',
  'Account & Access Management': 'Account Team',
};

const ROLE_LABEL: Record<string, string> = {
  branch_technician: 'IT Technician',
  branch_supervisor: 'IT Supervisor',
};

function displayName(user: UserProfile): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return full || user.username;
}

function initials(user: UserProfile): string {
  const name = displayName(user);
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const slaDefaults = [
  { priority: 'Critical', slaHours: 1,  triggers: '≥20 agents affected · VoIP/dialer completely down · system-wide outage' },
  { priority: 'High',     slaHours: 4,  triggers: '5–19 agents affected · CRM unavailable · network severely degraded' },
  { priority: 'Medium',   slaHours: 8,  triggers: '2–4 agents affected · peripheral issues · account lockouts' },
  { priority: 'Low',      slaHours: 24, triggers: 'Single agent · cosmetic issues · non-urgent requests' },
];

const SHIFT_META: Record<ShiftKey, {
  icon: React.ReactNode;
  hours: string;
  accentDark: string;
  accentLight: string;
  headerDark: string;
  headerLight: string;
  cellDark: string;
  cellLight: string;
}> = {
  Morning:   {
    icon:        <Sun  size={16} className="text-amber-400" />,
    hours:       '6:00 AM – 2:00 PM',
    accentDark:  'border-amber-500/30',
    accentLight: 'border-amber-300',
    headerDark:  'bg-amber-500/10 text-amber-300',
    headerLight: 'bg-amber-50 text-amber-700',
    cellDark:    'bg-amber-500/5',
    cellLight:   'bg-amber-50/40',
  },
  Afternoon: {
    icon:        <Sunset size={16} className="text-sky-400" />,
    hours:       '2:00 PM – 10:00 PM',
    accentDark:  'border-sky-500/30',
    accentLight: 'border-sky-300',
    headerDark:  'bg-sky-500/10 text-sky-300',
    headerLight: 'bg-sky-50 text-sky-700',
    cellDark:    'bg-sky-500/5',
    cellLight:   'bg-sky-50/40',
  },
  Night:     {
    icon:        <Moon  size={16} className="text-indigo-400" />,
    hours:       '10:00 PM – 6:00 AM',
    accentDark:  'border-indigo-500/30',
    accentLight: 'border-indigo-300',
    headerDark:  'bg-indigo-500/10 text-indigo-300',
    headerLight: 'bg-indigo-50 text-indigo-700',
    cellDark:    'bg-indigo-500/5',
    cellLight:   'bg-indigo-50/40',
  },
};

// ══════════════════════════════════════════════════════════════
export const TeamManagement = () => {
  const { tickets, currentUser } = useTickets();
  const { theme }   = useTheme();
  const isDark      = theme === 'dark';
  const activeShift = getActiveShift();
  const queryClient = useQueryClient();

  const currentBranchName: string = (currentUser.branch as string) ?? '';

  const isMainOrAdmin =
    (currentUser.role === 'Branch IT Supervisor' && currentBranchName === 'Main Branch') ||
    currentUser.role === 'Main Branch IT Manager';

  const [branchFilter,   setBranchFilter]   = useState<string>('All');
  const [scheduleFilter, setScheduleFilter] = useState<string>('All');

  // Optimistic shift state: userId → ShiftKey (cleared after API confirms)
  const [optimisticShifts, setOptimisticShifts] = useState<Record<number, ShiftKey>>({});

  // ── Data fetching ──────────────────────────────────────────
  const { data: staffUsers = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn:  () => getUsers(['branch_technician', 'branch_supervisor']),
  });

  const shiftMutation = useMutation({
    mutationFn: ({ userId, shift }: { userId: number; shift: string }) =>
      updateUserShift(userId, shift),
    onSuccess: (_, { userId }) => {
      setOptimisticShifts(prev => { const n = { ...prev }; delete n[userId]; return n; });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (_, { userId }) => {
      setOptimisticShifts(prev => { const n = { ...prev }; delete n[userId]; return n; });
      toast.error('Failed to update shift assignment.');
    },
  });

  // ── Helpers ────────────────────────────────────────────────
  const getShift = (userId: number): ShiftKey | null => {
    if (userId in optimisticShifts) return optimisticShifts[userId];
    const user = staffUsers.find(u => u.id === userId);
    if (!user?.shift) return null;
    return API_SHIFT_TO_KEY[user.shift] ?? null;
  };

  const toggleShift = (user: UserProfile, shift: ShiftKey) => {
    if (getShift(user.id) === shift) return;
    setOptimisticShifts(prev => ({ ...prev, [user.id]: shift }));
    shiftMutation.mutate({ userId: user.id, shift: SHIFT_KEY_TO_API[shift] });
    toast.success(`${displayName(user)} assigned to ${shift} shift`);
  };

  const techsForShift = (shift: ShiftKey, branch?: string) =>
    staffUsers.filter(u => {
      if (branch && branch !== 'All' && u.branch?.name !== branch) return false;
      if (!isMainOrAdmin && u.branch?.name !== currentBranchName) return false;
      return getShift(u.id) === shift;
    });

  const filteredTechs = staffUsers.filter(u => {
    if (!isMainOrAdmin && u.branch?.name !== currentBranchName) return false;
    if (isMainOrAdmin && branchFilter !== 'All' && u.branch?.name !== branchFilter) return false;
    return true;
  });

  // Team workload by ticket category (accurate proxy for functional team)
  const teamStats = bpoTeams.map(team => ({
    name:       team,
    open:       tickets.filter(t => FIGMA_CATEGORY_TO_TEAM[t.category] === team && t.status === 'Open').length,
    inProgress: tickets.filter(t => FIGMA_CATEGORY_TO_TEAM[t.category] === team && t.status === 'In Progress').length,
    resolved:   tickets.filter(t => FIGMA_CATEGORY_TO_TEAM[t.category] === team && t.status === 'Resolved').length,
    total:      tickets.filter(t => FIGMA_CATEGORY_TO_TEAM[t.category] === team).length,
  }));

  const card = `rounded-xl shadow-sm border p-6 transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;

  return (
    <div className="space-y-6 pb-4">

      {/* ── HEADER ── */}
      <div>
        <h1 className={`text-2xl flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <BarChart3 size={26} className="text-blue-500" /> Team &amp; SLA Management
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Monitor team workloads, shift schedules, and SLA policies for{' '}
          {isMainOrAdmin ? 'all branches' : currentBranchName}.
        </p>
      </div>

      {/* ── TEAM WORKLOAD ── */}
      <div className={card}>
        <h2 className={`text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Users size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Team Workload
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {teamStats.map(team => (
            <div
              key={team.name}
              className={`rounded-lg border p-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}
            >
              <p className={`text-sm mb-3 truncate font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {team.name}
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>Open</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.open}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>In Progress</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.inProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-green-400' : 'text-green-600'}>Resolved</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.resolved}</span>
                </div>
                <div className={`border-t pt-1.5 flex justify-between ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                  <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Total</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SHIFT SCHEDULE ── */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={`text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Clock size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Shift Schedule
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Technicians assigned per shift · click a badge to change assignment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
              activeShift === 'Morning'   ? (isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'   : 'bg-amber-50 text-amber-700 border-amber-200') :
              activeShift === 'Afternoon' ? (isDark ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'         : 'bg-sky-50 text-sky-700 border-sky-200') :
                                            (isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30': 'bg-indigo-50 text-indigo-700 border-indigo-200')
            }`}>
              {SHIFT_META[activeShift].icon} Active: {activeShift}
            </span>
            {isMainOrAdmin && (
              <HSelect
                value={scheduleFilter}
                onChange={setScheduleFilter}
                options={[
                  { value: 'All', label: 'All Branches' },
                  ...BRANCHES.map(b => ({ value: b, label: b })),
                ]}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        {staffLoading ? (
          <div className={`flex items-center justify-center py-12 gap-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <Loader2 size={18} className="animate-spin" /> Loading schedule…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SHIFTS.map(shift => {
              const meta     = SHIFT_META[shift];
              const techs    = techsForShift(shift, isMainOrAdmin ? scheduleFilter : currentBranchName);
              const isActive = shift === activeShift;
              return (
                <div
                  key={shift}
                  className={`rounded-xl border overflow-hidden ${
                    isActive
                      ? isDark ? `border-2 ${meta.accentDark}` : `border-2 ${meta.accentLight}`
                      : isDark ? 'border-slate-800' : 'border-gray-200'
                  }`}
                >
                  {/* Shift header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${isDark ? meta.headerDark : meta.headerLight}`}>
                    <div className="flex items-center gap-2">
                      {meta.icon}
                      <span className="text-sm font-medium">{shift}</span>
                      {isActive && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-700'}`}>
                          Active
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {techs.length} tech{techs.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Hours */}
                  <div className={`px-4 py-2 border-b text-xs ${
                    isDark ? 'border-slate-800 text-slate-500 bg-slate-950/40' : 'border-gray-100 text-gray-400 bg-gray-50/50'
                  }`}>
                    {meta.hours}
                  </div>

                  {/* Technician cards */}
                  <div className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
                    {techs.length === 0 ? (
                      <div className={`px-4 py-6 text-center text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                        <UserX size={20} className="mx-auto mb-2 opacity-40" />
                        No technicians assigned
                      </div>
                    ) : (
                      techs.map(user => {
                        const cfg = BRANCH_CONFIG[user.branch?.name as keyof typeof BRANCH_CONFIG] ?? { dotClass: 'bg-slate-500', color: '#64748b', label: user.branch?.name ?? '' };
                        return (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isActive ? isDark ? meta.cellDark : meta.cellLight : ''
                            } ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {initials(user)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                                {displayName(user)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />}
                                <span className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                  {ROLE_LABEL[user.role] ?? user.role}
                                </span>
                              </div>
                            </div>
                            <UserCheck size={13} className={isDark ? 'text-green-500 shrink-0' : 'text-green-600 shrink-0'} />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Coverage indicator */}
                  <div className={`px-4 py-2 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Coverage</span>
                      <span className={`text-xs font-medium inline-flex items-center gap-1 ${
                        techs.length === 0 ? 'text-red-500' :
                        techs.length < 3   ? 'text-amber-500' : 'text-green-500'
                      }`}>
                        {techs.length === 0 ? <><AlertTriangle size={10} /> Unstaffed</> :
                         techs.length < 3   ? <><Minus size={10} /> Light</>            : <><CheckCircle2 size={10} /> Adequate</>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── TECHNICIAN DIRECTORY ── */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className={`text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Users size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Technician Directory
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {isMainOrAdmin
                ? 'All branches · click M/A/N to change shift assignment'
                : `${currentBranchName} · click M/A/N to change shift assignment`}
            </p>
          </div>
          {isMainOrAdmin && (
            <HSelect
              value={branchFilter}
              onChange={setBranchFilter}
              options={[
                { value: 'All', label: 'All Branches' },
                ...BRANCHES.map(b => ({ value: b, label: b })),
              ]}
              isDark={isDark}
            />
          )}
        </div>

        {staffLoading ? (
          <div className={`flex items-center justify-center py-12 gap-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <Loader2 size={18} className="animate-spin" /> Loading directory…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                  <th className="py-3.5 px-4 text-left text-xs uppercase tracking-wider">Technician</th>
                  <th className="py-3.5 px-4 text-left text-xs uppercase tracking-wider">Branch</th>
                  <th className="py-3.5 px-4 text-left text-xs uppercase tracking-wider">Role</th>
                  <th className="py-3.5 px-4 text-left text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Sun size={12} className="text-amber-400" /> M</span>
                      <span className="flex items-center gap-1"><Sunset size={12} className="text-sky-400" /> A</span>
                      <span className="flex items-center gap-1"><Moon size={12} className="text-indigo-400" /> N</span>
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs uppercase tracking-wider">Current Shift</th>
                  <th className="py-3.5 px-4 text-left text-xs uppercase tracking-wider">Open</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
                {filteredTechs.map(user => {
                  const cfg          = BRANCH_CONFIG[user.branch?.name as keyof typeof BRANCH_CONFIG];
                  const userShift    = getShift(user.id);
                  const onActiveShift = userShift === activeShift;
                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'}`}
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {initials(user)}
                          </div>
                          <div>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {displayName(user)}
                            </span>
                            <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                              {user.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />}
                          <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                            {user.branch?.name ?? '—'}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${
                          user.role === 'branch_supervisor'
                            ? isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-700'
                            : isDark ? 'bg-blue-500/10 text-blue-400'    : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ROLE_LABEL[user.role] ?? user.role}
                        </span>
                      </td>

                      {/* Shift toggles */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {SHIFTS.map(shift => {
                            const on   = userShift === shift;
                            const meta = SHIFT_META[shift];
                            const isAct = shift === activeShift;
                            return (
                              <button
                                key={shift}
                                onClick={() => toggleShift(user, shift)}
                                title={`Assign ${displayName(user)} to ${shift} shift`}
                                className={`w-7 h-7 rounded-lg text-xs font-medium border transition-all ${
                                  on
                                    ? isAct
                                      ? isDark ? `${meta.headerDark} border-transparent ring-1 ring-offset-1 ring-offset-slate-900 ${meta.accentDark}` : `${meta.headerLight} border-transparent`
                                      : isDark ? `${meta.headerDark} border-transparent` : `${meta.headerLight} border-transparent`
                                    : isDark ? 'bg-transparent text-slate-700 border-slate-800 hover:border-slate-600' : 'bg-transparent text-gray-300 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {shift[0]}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Current shift status */}
                      <td className="py-3.5 px-4">
                        {onActiveShift ? (
                          <div className={`flex items-center gap-1.5 text-xs ${
                            activeShift === 'Morning'   ? (isDark ? 'text-amber-400' : 'text-amber-600') :
                            activeShift === 'Afternoon' ? (isDark ? 'text-sky-400'   : 'text-sky-600')   :
                                                          (isDark ? 'text-indigo-400' : 'text-indigo-600')
                          }`}>
                            <UserCheck size={13} />
                            On Duty — {activeShift}
                          </div>
                        ) : userShift ? (
                          <span className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            <UserX size={13} /> Off-shift ({userShift})
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                            <UserX size={13} /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Open ticket count */}
                      <td className="py-3.5 px-4">
                        <span className={`text-xs font-medium ${
                          user.open_ticket_count > 3
                            ? isDark ? 'text-red-400' : 'text-red-600'
                            : user.open_ticket_count > 0
                              ? isDark ? 'text-amber-400' : 'text-amber-600'
                              : isDark ? 'text-slate-500' : 'text-gray-400'
                        }`}>
                          {user.open_ticket_count}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredTechs.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`py-8 text-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                      No staff found for this branch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: shift coverage summary */}
        {!staffLoading && (
          <div className={`flex flex-wrap gap-4 pt-4 mt-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            {SHIFTS.map(shift => {
              const count = filteredTechs.filter(u => getShift(u.id) === shift).length;
              const meta  = SHIFT_META[shift];
              const isAct = shift === activeShift;
              return (
                <div key={shift} className="flex items-center gap-2">
                  {meta.icon}
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{shift}:</span>
                  <span className={`text-xs font-medium ${
                    isAct
                      ? isDark ? 'text-white' : 'text-gray-900'
                      : isDark ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {count} assigned
                  </span>
                  {isAct && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                      active
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SLA POLICIES ── */}
      <div className={card}>
        <h2 className={`text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Clock size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> BPO SLA Policies
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                {['Priority', 'SLA Target', 'BPO Trigger Conditions'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
              {slaDefaults.map(row => (
                <tr key={row.priority} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${
                      row.priority === 'Critical' ? (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20'           : 'bg-red-100 text-red-800 border-red-200')
                      : row.priority === 'High'   ? (isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-100 text-orange-800 border-orange-200')
                      : row.priority === 'Medium' ? (isDark ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200')
                      :                             (isDark ? 'bg-slate-800 text-slate-300 border-slate-700'           : 'bg-gray-100 text-gray-800 border-gray-200')
                    }`}>{row.priority}</span>
                  </td>
                  <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {row.slaHours}h resolution
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {row.triggers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ESCALATION RULES ── */}
      <div className={card}>
        <h2 className={`text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <AlertTriangle size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Escalation Rules
        </h2>
        <div className="space-y-3">
          {[
            { rule: 'Auto-escalate Critical ticket to Main Branch if unresolved after 1 hour', active: true },
            { rule: 'Auto-escalate High ticket to branch supervisor if unresolved after 4 hours', active: true },
            { rule: 'Notify Main Branch IT Manager when 3+ Critical tickets open simultaneously', active: true },
            { rule: 'Escalate floor-wide incidents to Main Branch immediately upon creation', active: false },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{item.rule}</span>
              <span className={`ml-4 shrink-0 text-xs px-2 py-1 rounded-full ${
                item.active
                  ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'
                  : isDark ? 'bg-slate-800 text-slate-500'    : 'bg-gray-200 text-gray-500'
              }`}>
                {item.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
