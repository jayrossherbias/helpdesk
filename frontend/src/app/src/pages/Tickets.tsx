import React, { useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Search, Eye, AlertTriangle, Building2, Filter, X,
  Users, Clock, ChevronDown, ChevronUp, ArrowRight, Link2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Status, Priority, Category, Branch, Shift, EscalationStatus,
  BPO_CATEGORIES, BRANCHES, BRANCH_CONFIG, SLA_HOURS,
} from '../types';
import { HSelect } from '../components/HSelect';

const ALL = 'All';

// ── SLA helpers ────────────────────────────────────────────────
const getSLAStatus = (
  priority: Priority,
  createdAt: string,
  status: Status,
): 'On Track' | 'At Risk' | 'Breached' | 'Resolved' => {
  if (status === 'Resolved') return 'Resolved';
  const slaMs   = SLA_HOURS[priority] * 3_600_000;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const pct     = elapsed / slaMs;
  if (pct >= 1)    return 'Breached';
  if (pct >= 0.75) return 'At Risk';
  return 'On Track';
};

const getSLATimeLeft = (priority: Priority, createdAt: string): string => {
  const slaMs   = SLA_HOURS[priority] * 3_600_000;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const rem     = slaMs - elapsed;
  if (rem <= 0) {
    const over = -rem;
    const hrs  = Math.floor(over / 3_600_000);
    const mins = Math.floor((over % 3_600_000) / 60_000);
    return hrs > 0 ? `${hrs}h ${mins}m over` : `${mins}m over`;
  }
  const hrs  = Math.floor(rem / 3_600_000);
  const mins = Math.floor((rem % 3_600_000) / 60_000);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

// ── Style helpers ───────────────────────────────────────────────
const slaBadgeDark: Record<string, string> = {
  'On Track': 'bg-green-500/10 text-green-400 border-green-500/20',
  'At Risk':  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Breached': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Resolved': 'bg-slate-800 text-slate-400 border-slate-700',
};
const slaBadgeLight: Record<string, string> = {
  'On Track': 'bg-green-100 text-green-800 border-green-200',
  'At Risk':  'bg-amber-100 text-amber-800 border-amber-200',
  'Breached': 'bg-red-100 text-red-800 border-red-200',
  'Resolved': 'bg-gray-100 text-gray-600 border-gray-200',
};

const prioBadgeDark: Record<Priority, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  High:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low:      'bg-slate-800 text-slate-300 border-slate-700',
};
const prioBadgeLight: Record<Priority, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High:     'bg-orange-100 text-orange-800 border-orange-200',
  Medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low:      'bg-gray-100 text-gray-700 border-gray-200',
};

const statusBadgeDark: Record<Status, string> = {
  'Open':        'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Resolved':    'bg-green-500/10 text-green-400 border-green-500/20',
};
const statusBadgeLight: Record<Status, string> = {
  'Open':        'bg-amber-100 text-amber-800 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'Resolved':    'bg-green-100 text-green-800 border-green-200',
};

// ══════════════════════════════════════════════════════════════
export const Tickets = () => {
  const { tickets, currentUser } = useTickets();
  const { theme } = useTheme();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark    = theme === 'dark';

  const isMainOrAdmin =
    (currentUser.role === 'Branch IT Supervisor' && currentUser.branch === 'Main Branch') ||
    currentUser.role === 'Main Branch IT Manager';

  const [tab,              setTab]              = useState<'tickets' | 'floorwide'>('tickets');
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState<Status | 'All'>((searchParams.get('status') as Status) || ALL);
  const [priorityFilter,   setPriorityFilter]   = useState<Priority | 'All'>((searchParams.get('priority') as Priority) || ALL);
  const [categoryFilter,   setCategoryFilter]   = useState<Category | 'All'>(ALL);
  const [shiftFilter,      setShiftFilter]      = useState<Shift | 'All'>(ALL);
  const [branchFilter,     setBranchFilter]     = useState<Branch | 'All'>((searchParams.get('branch') as Branch) || ALL);
  const [escalationFilter, setEscalationFilter] = useState<EscalationStatus | 'All'>((searchParams.get('escalation') as EscalationStatus) || ALL);
  const [filtersOpen,      setFiltersOpen]      = useState(true);

  // Scope by role / branch
  const scopedTickets = tickets.filter(t => {
    if (currentUser.role === 'Agent (end-user)') return t.creator === currentUser.name;
    if (isMainOrAdmin) return true;
    return t.branch === currentUser.branch;
  });

  const visibleTickets = scopedTickets
    .filter(t => statusFilter     === ALL || t.status           === statusFilter)
    .filter(t => priorityFilter   === ALL || t.priority         === priorityFilter)
    .filter(t => categoryFilter   === ALL || t.category         === categoryFilter)
    .filter(t => shiftFilter      === ALL || t.shift            === shiftFilter)
    .filter(t => branchFilter     === ALL || t.branch           === branchFilter)
    .filter(t => escalationFilter === ALL || t.escalationStatus === escalationFilter)
    .filter(t =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  const floorWideTickets = scopedTickets.filter(t => t.isFloorWide);

  const activeFilterCount = [statusFilter, priorityFilter, categoryFilter, shiftFilter,
    isMainOrAdmin ? branchFilter : ALL, escalationFilter]
    .filter(v => v !== ALL).length + (searchTerm ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter(ALL); setPriorityFilter(ALL); setCategoryFilter(ALL);
    setShiftFilter(ALL);  setBranchFilter(ALL);   setEscalationFilter(ALL);
    setSearchTerm('');
  };

  // Helpers
  const prioBadge  = (p: Priority) => isDark ? prioBadgeDark[p]   : prioBadgeLight[p];
  const statBadge  = (s: Status)   => isDark ? statusBadgeDark[s] : statusBadgeLight[s];
  const slaBadge   = (k: string)   => isDark ? slaBadgeDark[k]    : slaBadgeLight[k];

  const card     = `rounded-xl shadow-sm border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;

  return (
    <div className="space-y-5 pb-4">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentUser.role === 'Agent (end-user)' ? 'My Tickets' : 'All Tickets'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {isMainOrAdmin
              ? `All branches visible · ${scopedTickets.length} total tickets`
              : `${currentUser.branch} · ${scopedTickets.length} tickets`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
          >
            + New Ticket
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className={`flex gap-1 p-1 rounded-lg w-fit ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {(['tickets', 'floorwide'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                tab === t
                  ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'tickets' ? 'All Tickets' : 'Floor-Wide Incidents'}
              {t === 'floorwide' && floorWideTickets.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                }`}>
                  {floorWideTickets.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'tickets' && (
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              isDark
                ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                {activeFilterCount}
              </span>
            )}
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* ── ALL TICKETS TAB ── */}
      {tab === 'tickets' && (
        <>
          {/* Filter Panel */}
          {filtersOpen && (
            <div className={`${card} p-4 space-y-4`}>
              {/* Search + Clear */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search by ID or title…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-gray-300 text-slate-900 placeholder-gray-400'
                    }`}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                      isDark
                        ? 'border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40'
                        : 'border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300'
                    }`}
                  >
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>

              {/* Filter dropdowns row */}
              <div className="flex flex-wrap gap-3">
                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Status</label>
                  <HSelect
                    value={statusFilter}
                    onChange={v => setStatusFilter(v as Status | 'All')}
                    options={[
                      { value: 'All', label: 'All Statuses' },
                      { value: 'Open', label: 'Open' },
                      { value: 'In Progress', label: 'In Progress' },
                      { value: 'Resolved', label: 'Resolved' },
                    ]}
                    isDark={isDark}
                  />
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1">
                  <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Priority</label>
                  <HSelect
                    value={priorityFilter}
                    onChange={v => setPriorityFilter(v as Priority | 'All')}
                    options={[
                      { value: 'All', label: 'All Priorities' },
                      { value: 'Critical', label: 'Critical' },
                      { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Low', label: 'Low' },
                    ]}
                    isDark={isDark}
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Category</label>
                  <HSelect
                    value={categoryFilter}
                    onChange={v => setCategoryFilter(v as Category | 'All')}
                    options={[
                      { value: 'All', label: 'All Categories' },
                      ...BPO_CATEGORIES.map(c => ({ value: c, label: c })),
                    ]}
                    isDark={isDark}
                  />
                </div>

                {/* Shift */}
                <div className="flex flex-col gap-1">
                  <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Shift</label>
                  <HSelect
                    value={shiftFilter}
                    onChange={v => setShiftFilter(v as Shift | 'All')}
                    options={[
                      { value: 'All', label: 'All Shifts' },
                      { value: 'Morning', label: 'Morning' },
                      { value: 'Afternoon', label: 'Afternoon' },
                      { value: 'Night', label: 'Night' },
                    ]}
                    isDark={isDark}
                  />
                </div>

                {/* Branch — Main Branch only */}
                {isMainOrAdmin && (
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Branch</label>
                    <HSelect
                      value={branchFilter}
                      onChange={v => setBranchFilter(v as Branch | 'All')}
                      options={[
                        { value: 'All', label: 'All Branches' },
                        ...BRANCHES.map(b => ({ value: b, label: b })),
                      ]}
                      isDark={isDark}
                    />
                  </div>
                )}

                {/* Escalation Status */}
                <div className="flex flex-col gap-1">
                  <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Escalation</label>
                  <HSelect
                    value={escalationFilter}
                    onChange={v => setEscalationFilter(v as EscalationStatus | 'All')}
                    options={[
                      { value: 'All', label: 'All Escalation States' },
                      { value: 'Not Escalated', label: 'Not Escalated' },
                      { value: 'Escalated', label: 'Escalated' },
                      { value: 'Resolved by Main Branch', label: 'Resolved by Main Branch' },
                    ]}
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <FilterChip label={`"${searchTerm}"`} onRemove={() => setSearchTerm('')} isDark={isDark} />
                  )}
                  {statusFilter !== ALL && (
                    <FilterChip label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter(ALL)} isDark={isDark} />
                  )}
                  {priorityFilter !== ALL && (
                    <FilterChip label={`Priority: ${priorityFilter}`} onRemove={() => setPriorityFilter(ALL)} isDark={isDark} />
                  )}
                  {categoryFilter !== ALL && (
                    <FilterChip label={`Category: ${categoryFilter}`} onRemove={() => setCategoryFilter(ALL)} isDark={isDark} />
                  )}
                  {shiftFilter !== ALL && (
                    <FilterChip label={`Shift: ${shiftFilter}`} onRemove={() => setShiftFilter(ALL)} isDark={isDark} />
                  )}
                  {isMainOrAdmin && branchFilter !== ALL && (
                    <FilterChip label={`Branch: ${branchFilter}`} onRemove={() => setBranchFilter(ALL)} isDark={isDark} />
                  )}
                  {escalationFilter !== ALL && (
                    <FilterChip label={`Escalation: ${escalationFilter}`} onRemove={() => setEscalationFilter(ALL)} isDark={isDark} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Showing <span className={isDark ? 'text-white' : 'text-gray-900'}>{visibleTickets.length}</span> of {scopedTickets.length} tickets
              {activeFilterCount > 0 && ' (filtered)'}
            </p>
          </div>

          {/* Table */}
          <div className={`${card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <th className="pl-4 pr-2 py-3">ID</th>
                    <th className="px-2 py-3">Title</th>
                    {isMainOrAdmin && <th className="px-2 py-3">Branch</th>}
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Priority</th>
                    <th className="px-2 py-3">Category</th>
                    <th className="px-2 py-3">Shift</th>
                    <th className="px-2 py-3">Agents</th>
                    <th className="px-2 py-3">SLA</th>
                    <th className="pl-2 pr-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-gray-100'}`}>
                  {visibleTickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isMainOrAdmin ? 10 : 9}
                        className={`px-6 py-14 text-center ${isDark ? 'text-slate-600' : 'text-gray-400'}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Search size={28} className="opacity-40" />
                          <p className="text-sm">No tickets found matching your filters.</p>
                          {activeFilterCount > 0 && (
                            <button
                              onClick={clearFilters}
                              className="text-xs text-blue-500 hover:underline mt-1"
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleTickets.map(ticket => {
                      const sla     = getSLAStatus(ticket.priority, ticket.createdAt, ticket.status);
                      const timeLeft = ticket.status !== 'Resolved' ? getSLATimeLeft(ticket.priority, ticket.createdAt) : null;
                      return (
                        <tr
                          key={ticket.id}
                          className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50/80'}`}
                        >
                          {/* ID */}
                          <td className={`pl-4 pr-2 py-3 whitespace-nowrap text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {ticket.ticket_number ?? `#${ticket.id.slice(0, 8)}`}
                          </td>

                          {/* Title */}
                          <td className={`px-2 py-3 text-sm ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                            <div className="flex items-center gap-1.5">
                              {ticket.isFloorWide && (
                                <AlertTriangle size={13} className="text-orange-400 shrink-0" title="Floor-Wide Incident" />
                              )}
                              {ticket.escalationStatus === 'Escalated' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                                  ESC
                                </span>
                              )}
                              <span className="truncate max-w-[160px]" title={ticket.title}>{ticket.title}</span>
                            </div>
                          </td>

                          {/* Branch (Main only) */}
                          {isMainOrAdmin && (
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${BRANCH_CONFIG[ticket.branch]?.dotClass ?? ''}`} />
                                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {ticket.branch.replace(' Branch', '')}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Status */}
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${statBadge(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </td>

                          {/* Priority */}
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${prioBadge(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>

                          {/* Category */}
                          <td className={`px-2 py-3 text-xs whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            <span className="truncate max-w-[110px] block">{ticket.category}</span>
                          </td>

                          {/* Shift */}
                          <td className={`px-2 py-3 whitespace-nowrap text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {ticket.shift}
                          </td>

                          {/* Agents Affected */}
                          <td className={`px-2 py-3 whitespace-nowrap text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            <div className="flex items-center gap-1">
                              <Users size={12} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
                              {ticket.agentsAffected}
                            </div>
                          </td>

                          {/* SLA Status */}
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className={`px-2 py-0.5 text-xs rounded-full border w-fit ${slaBadge(sla)}`}>
                                {sla}
                              </span>
                              {timeLeft && sla !== 'Resolved' && (
                                <span className={`text-xs ${
                                  sla === 'Breached'
                                    ? isDark ? 'text-red-500' : 'text-red-600'
                                    : sla === 'At Risk'
                                    ? isDark ? 'text-amber-500' : 'text-amber-600'
                                    : isDark ? 'text-slate-600' : 'text-gray-400'
                                }`}>
                                  {sla === 'Breached' ? timeLeft : `${timeLeft} left`}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="pl-2 pr-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                isDark
                                  ? 'border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/40'
                                  : 'border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300'
                              }`}
                            >
                              <Eye size={13} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── FLOOR-WIDE INCIDENTS TAB ── */}
      {tab === 'floorwide' && (
        <div className="space-y-4">
          {/* Summary banner */}
          {floorWideTickets.length > 0 && (
            <div className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${
              isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
            }`}>
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  {floorWideTickets.filter(t => t.status !== 'Resolved').length} active floor-wide incident{floorWideTickets.filter(t => t.status !== 'Resolved').length !== 1 ? 's' : ''} requiring attention
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400/60' : 'text-red-600/60'}`}>
                  {floorWideTickets.filter(t => t.priority === 'Critical').length} critical ·{' '}
                  {floorWideTickets.reduce((acc, t) => acc + (t.agentsAffected || 0), 0)} total agents affected
                </p>
              </div>
              <span className={`text-xs font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                {floorWideTickets.length} total
              </span>
            </div>
          )}

          {floorWideTickets.length === 0 ? (
            <div className={`rounded-xl border p-14 text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <AlertTriangle size={24} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
                </div>
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  No floor-wide incidents detected.
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>
                  Floor-wide incidents are created when ≥10 agents on a single floor report the same issue.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {floorWideTickets.map(t => {
                const sla      = getSLAStatus(t.priority, t.createdAt, t.status);
                const timeLeft = t.status !== 'Resolved' ? getSLATimeLeft(t.priority, t.createdAt) : null;
                const slaMs    = SLA_HOURS[t.priority] * 3_600_000;
                const elapsed  = Date.now() - new Date(t.createdAt).getTime();
                const slaPct   = Math.min(100, Math.round((elapsed / slaMs) * 100));

                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className={`rounded-xl border-l-4 border overflow-hidden cursor-pointer transition-all group ${
                      t.priority === 'Critical' ? (isDark ? 'border-l-red-500' : 'border-l-red-400') :
                      t.priority === 'High'     ? (isDark ? 'border-l-orange-500' : 'border-l-orange-400') :
                      t.priority === 'Medium'   ? (isDark ? 'border-l-yellow-500' : 'border-l-yellow-400') :
                                                  (isDark ? 'border-l-slate-600' : 'border-l-gray-300')
                    } ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="p-5">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <AlertTriangle
                            size={18}
                            className={`shrink-0 mt-0.5 ${
                              t.priority === 'Critical' ? 'text-red-400' : 'text-orange-400'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${prioBadge(t.priority)}`}>
                                {t.priority}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${statBadge(t.status)}`}>
                                {t.status}
                              </span>
                              {isMainOrAdmin && (
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${BRANCH_CONFIG[t.branch]?.dotClass ?? ''}`} />
                                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t.branch}</span>
                                </div>
                              )}
                              {t.escalationStatus === 'Escalated' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                  Escalated
                                </span>
                              )}
                            </div>
                            <p className={`truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {t.title}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          size={16}
                          className={`shrink-0 mt-1 transition-transform group-hover:translate-x-0.5 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}
                        />
                      </div>

                      {/* Meta row */}
                      <div className={`flex flex-wrap items-center gap-4 text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <span className="flex items-center gap-1"><Users size={11} /> {t.agentsAffected} agents affected</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {t.shift} shift</span>
                        {t.floor && <span>{t.floor}</span>}
                        {t.category && <span>{t.category}</span>}
                        {t.linkedIncident && (
                          <span className={`flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            <Link2 size={10} /> Linked: {t.linkedIncident}
                          </span>
                        )}
                        <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>#{t.id}</span>
                      </div>

                      {/* SLA section */}
                      {t.status !== 'Resolved' && (
                        <div className={`pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-gray-100'}`}>
                          {sla === 'Breached' ? (
                            /* Breached — no bar (would just be a 2nd red stripe), show pulse badge instead */
                            <div className="flex items-center justify-between">
                              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                SLA — {SLA_HOURS[t.priority]}h window
                              </span>
                              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border animate-pulse ${
                                isDark
                                  ? 'bg-red-500/10 text-red-400 border-red-500/25'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                BREACHED · {timeLeft}
                              </span>
                            </div>
                          ) : (
                            /* On Track / At Risk — progress bar is meaningful here */
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                  SLA — {SLA_HOURS[t.priority]}h window
                                </span>
                                <span className={`text-xs font-medium ${sla === 'At Risk' ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-green-400' : 'text-green-600')}`}>
                                  {timeLeft} remaining
                                </span>
                              </div>
                              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    sla === 'At Risk' ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${slaPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Filter chip component ───────────────────────────────────────
const FilterChip = ({
  label,
  onRemove,
  isDark,
}: {
  label: string;
  onRemove: () => void;
  isDark: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
      isDark
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        : 'bg-blue-50 text-blue-700 border-blue-200'
    }`}
  >
    {label}
    <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
      <X size={11} />
    </button>
  </span>
);