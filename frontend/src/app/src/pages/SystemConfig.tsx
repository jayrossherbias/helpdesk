import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import {
  Settings, Shield, Zap, Globe, Bell, Map,
  AlertTriangle, Network, Pencil, Check, X,
  Building2, Users, Clock, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getRules, updateRule, getSLAConfig } from '../../../api/routing';
import { getBranches } from '../../../api/accounts';
import { getSystemSettings, patchSystemSettings } from '../../../api/tickets';
import type { RoutingRule, SlaConfig } from '../../../types';

// ── Category slug → display label ─────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  voip_dialer:    'VoIP & Dialer Issues',
  crm_software:   'CRM & Call Center Software',
  workstation:    'Workstation & Peripherals',
  network:        'Network & Connectivity',
  account_access: 'Account & Access Management',
};

// ── Escalation rule shape ──────────────────────────────────────
type EscRow = {
  priority:   string;
  slaHours:   number;
  threshold:  number;
  agentRange: string;
  trigger:    string;
  action:     string;
  active:     boolean;
};

const BASE_ESC_RULES: EscRow[] = [
  { priority: 'Critical', slaHours: 1,  threshold: 75, agentRange: '20+ agents',  trigger: 'System-wide outage · VoIP completely down',  action: 'Notify Main Branch IT Manager · Alert branch supervisor · Page on-call tech', active: true },
  { priority: 'High',     slaHours: 4,  threshold: 75, agentRange: '5–19 agents', trigger: 'CRM unavailable · Network severely degraded', action: 'Notify branch IT Manager · Escalate if unresolved by SLA breach',              active: true },
  { priority: 'Medium',   slaHours: 8,  threshold: 75, agentRange: '2–4 agents',  trigger: 'Peripheral issues · Account lockouts',        action: 'Remind assigned team · Log SLA warning in ticket history',                    active: true },
  { priority: 'Low',      slaHours: 24, threshold: 75, agentRange: '1 agent',     trigger: 'Cosmetic issues · Non-urgent requests',       action: 'Send reminder notification to assigned team',                                 active: false },
];

// localStorage helpers for workflow toggles
const loadToggle = (key: string, fallback = true) => {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v !== 'false';
};
const saveToggle = (key: string, value: boolean) => localStorage.setItem(key, String(value));

// ══════════════════════════════════════════════════════════════
export const SystemConfig = () => {
  const { theme }  = useTheme();
  const isDark     = theme === 'dark';
  const queryClient = useQueryClient();

  // ── API queries ──────────────────────────────────────────
  const { data: apiRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['routing-rules'],
    queryFn:  getRules,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn:  getBranches,
  });

  const { data: slaConfig } = useQuery({
    queryKey: ['sla-config'],
    queryFn:  getSLAConfig,
  });

  // ── Routing rule mutation ────────────────────────────────
  const ruleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Pick<RoutingRule, 'keywords' | 'assigned_team_name'> }) =>
      updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      setEditRouteId(null);
      toast.success('Routing rule updated');
    },
    onError: () => toast.error('Failed to update routing rule'),
  });

  // ── Routing edit state ───────────────────────────────────
  const [editRouteId,   setEditRouteId]   = useState<string | null>(null);
  const [editKeywords,  setEditKeywords]  = useState('');
  const [editTeam,      setEditTeam]      = useState('');

  const startEditRoute = (rule: RoutingRule) => {
    setEditRouteId(rule.id);
    setEditKeywords(rule.keywords);
    setEditTeam(rule.assigned_team_name);
  };
  const saveRoute = (rule: RoutingRule) => {
    ruleMutation.mutate({ id: rule.id, data: { keywords: editKeywords.trim(), assigned_team_name: editTeam.trim() } });
  };
  const cancelRoute = () => setEditRouteId(null);

  // ── Escalation rules state (seeded from SLA API) ─────────
  const [escRules,   setEscRules]   = useState<EscRow[]>(BASE_ESC_RULES);
  const [editEscIdx, setEditEscIdx] = useState<number | null>(null);
  const [escDraft,   setEscDraft]   = useState<Partial<EscRow>>({});

  useEffect(() => {
    if (!slaConfig) return;
    setEscRules(prev => prev.map(r => ({
      ...r,
      slaHours:  (slaConfig as any)[`${r.priority.toLowerCase()}_hours`] ?? r.slaHours,
      threshold: slaConfig.warning_threshold_pct ?? r.threshold,
    })));
  }, [slaConfig]);

  const startEditEsc = (i: number) => { setEditEscIdx(i); setEscDraft({ ...escRules[i] }); };
  const saveEsc      = (i: number) => {
    setEscRules(prev => { const n = [...prev]; n[i] = { ...n[i], ...escDraft } as EscRow; return n; });
    setEditEscIdx(null);
    toast.success(`${escRules[i].priority} escalation rule updated`);
  };
  const cancelEsc = () => setEditEscIdx(null);
  const toggleEscActive = (i: number) => {
    setEscRules(prev => {
      const n = [...prev]; const v = !n[i].active; n[i] = { ...n[i], active: v };
      toast.success(`${n[i].priority} rule ${v ? 'activated' : 'deactivated'}`);
      return n;
    });
  };

  // ── Workflow toggles ─────────────────────────────────────
  const [autoRouting,  setAutoRouting]  = useState(() => loadToggle('cfg_autoRouting'));
  const [autoPriority, setAutoPriority] = useState(() => loadToggle('cfg_autoPriority'));
  const [emailNotifs,  setEmailNotifs]  = useState(() => loadToggle('cfg_emailNotifs'));
  const [slaAlerts,    setSlaAlerts]    = useState(() => loadToggle('cfg_slaAlerts'));

  // Fetch from backend and sync localStorage so other components stay in sync
  useQuery({
    queryKey: ['system-settings'],
    queryFn:  getSystemSettings,
    onSuccess: (data: { auto_routing: boolean; auto_priority: boolean; email_notifications: boolean; sla_alerts: boolean }) => {
      setAutoRouting(data.auto_routing);   saveToggle('cfg_autoRouting',  data.auto_routing);
      setAutoPriority(data.auto_priority); saveToggle('cfg_autoPriority', data.auto_priority);
      setEmailNotifs(data.email_notifications); saveToggle('cfg_emailNotifs', data.email_notifications);
      setSlaAlerts(data.sla_alerts);       saveToggle('cfg_slaAlerts',    data.sla_alerts);
    },
  } as any);

  const settingsMutation = useMutation({
    mutationFn: patchSystemSettings,
    onError: () => toast.error('Failed to save setting — please try again.'),
  });

  const handleToggle = (
    key: string,
    apiKey: 'auto_routing' | 'auto_priority' | 'email_notifications' | 'sla_alerts',
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
  ) => {
    setter(prev => {
      const next = !prev;
      saveToggle(key, next);
      settingsMutation.mutate({ [apiKey]: next });
      toast.success(`${label} ${next ? 'enabled' : 'disabled'}`);
      return next;
    });
  };

  // ── Styles ───────────────────────────────────────────────
  const card       = `rounded-xl shadow-sm border transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`;
  const toggleBase = (on: boolean) => `relative w-11 h-6 rounded-full transition-colors cursor-pointer ${on ? 'bg-blue-600' : isDark ? 'bg-slate-700' : 'bg-gray-300'}`;
  const dotBase    = (on: boolean) => `absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`;
  const inputCls   = `px-2.5 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`;
  const btnPrimary = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60`;
  const btnGhost   = `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200'}`;

  const prioBadge = (p: string) =>
    p === 'Critical' ? (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20'         : 'bg-red-100 text-red-800 border-red-200')
    : p === 'High'   ? (isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-100 text-orange-800 border-orange-200')
    : p === 'Medium' ? (isDark ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200')
    :                  (isDark ? 'bg-slate-800 text-slate-300 border-slate-700'           : 'bg-gray-100 text-gray-800 border-gray-200');

  const loadingRow = (cols: number) => (
    <tr>
      <td colSpan={cols} className="py-8 text-center">
        <Loader2 size={18} className={`inline animate-spin ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
      </td>
    </tr>
  );

  return (
    <div className="space-y-6 pb-4">

      {/* ── HEADER ── */}
      <div>
        <h1 className={`text-2xl flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Settings size={26} className="text-blue-500" /> System Configuration
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Manage BPO helpdesk settings, routing rules, branch management, and workflow automation.
        </p>
      </div>

      {/* ── WORKFLOW & AUTOMATION ── */}
      <div className={`${card} p-6`}>
        <h2 className={`text-base mb-5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Zap size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Workflow &amp; Automation
        </h2>
        <div className="space-y-3">
          {([
            { key: 'cfg_autoRouting',  apiKey: 'auto_routing',        label: 'Auto-Routing',         desc: 'Auto-assign tickets to teams based on BPO category and keywords',        value: autoRouting,  setter: setAutoRouting  },
            { key: 'cfg_autoPriority', apiKey: 'auto_priority',       label: 'Auto-Prioritization',  desc: 'Set priority based on agents affected and BPO trigger keywords',         value: autoPriority, setter: setAutoPriority },
            { key: 'cfg_emailNotifs',  apiKey: 'email_notifications', label: 'Email / Notification', desc: 'Send notifications on ticket creation, status changes, and escalations', value: emailNotifs,  setter: setEmailNotifs  },
            { key: 'cfg_slaAlerts',    apiKey: 'sla_alerts',          label: 'SLA Breach Alerts',    desc: 'Warn at 75% elapsed SLA time; auto-notify supervisors on breach',        value: slaAlerts,    setter: setSlaAlerts    },
          ] as const).map(item => (
            <div
              key={item.label}
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}
            >
              <div>
                <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.label}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{item.desc}</p>
              </div>
              <button
                className={toggleBase(item.value)}
                onClick={() => handleToggle(item.key, item.apiKey as any, item.setter as React.Dispatch<React.SetStateAction<boolean>>, item.label)}
                disabled={settingsMutation.isPending}
              >
                <div className={dotBase(item.value)} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROUTING RULES ── */}
      <div className={`${card} overflow-hidden`}>
        <div className={`flex items-start justify-between px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div>
            <h2 className={`text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Network size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Routing Rules
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Keyword-based auto-routing: when a ticket's title or description matches any keyword, it routes to the assigned team.
              <span className={`ml-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Click ✎ to edit keywords or team.</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-500'}`}>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider w-52">Category</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider w-44">Assigned Team</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">Keyword Triggers</th>
                <th className="py-3.5 px-5 text-right text-xs uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-50'}`}>
              {rulesLoading
                ? loadingRow(4)
                : apiRules.map(rule => {
                    const isEditing = editRouteId === rule.id;
                    return (
                      <tr
                        key={rule.id}
                        className={`transition-colors ${
                          isEditing
                            ? isDark ? 'bg-blue-500/5' : 'bg-blue-50/50'
                            : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className={`py-4 px-5 font-medium text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {CATEGORY_LABELS[rule.category] ?? rule.category}
                        </td>

                        <td className="py-4 px-5">
                          {isEditing ? (
                            <input
                              value={editTeam}
                              onChange={e => setEditTeam(e.target.value)}
                              className={`${inputCls} w-full`}
                              placeholder="Team name"
                            />
                          ) : (
                            <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                              {rule.assigned_team_name}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          {isEditing ? (
                            <input
                              value={editKeywords}
                              onChange={e => setEditKeywords(e.target.value)}
                              className={`${inputCls} w-full`}
                              placeholder="comma, separated, keywords"
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {rule.keywords.split(',').map(kw => kw.trim()).filter(Boolean).map(kw => (
                                <span
                                  key={kw}
                                  className={`text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => saveRoute(rule)}
                                disabled={ruleMutation.isPending}
                                className={btnPrimary}
                              >
                                {ruleMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                              </button>
                              <button onClick={cancelRoute} className={btnGhost}>
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startEditRoute(rule)} className={btnGhost} title="Edit keywords and team">
                              <Pencil size={12} /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        <div className={`px-5 py-3 border-t ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-gray-100 bg-gray-50/50'}`}>
          <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            Auto-routing is {autoRouting ? 'enabled' : 'disabled'} ·
            Keywords are case-insensitive and matched against ticket title and description ·
            Changes are saved to the database immediately
          </p>
        </div>
      </div>

      {/* ── ESCALATION RULES ── */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h2 className={`text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <AlertTriangle size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Escalation Rules
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            SLA windows are sourced from the system engine · threshold and actions can be adjusted per priority.
            <span className={`ml-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Click ✎ to edit thresholds.</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-500'}`}>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider w-28">Priority</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider w-44">SLA / Threshold</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">BPO Trigger</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">Escalation Action</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider w-24">Status</th>
                <th className="py-3.5 px-5 text-right text-xs uppercase tracking-wider w-28">Edit</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-50'}`}>
              {escRules.map((row, i) => {
                const isEditing  = editEscIdx === i;
                const thresholdH = ((isEditing ? escDraft.threshold ?? row.threshold : row.threshold) / 100) *
                  (isEditing ? escDraft.slaHours ?? row.slaHours : row.slaHours);
                return (
                  <tr
                    key={row.priority}
                    className={`transition-colors ${
                      isEditing
                        ? isDark ? 'bg-blue-500/5' : 'bg-blue-50/50'
                        : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50/80'
                    } ${!row.active ? (isDark ? 'opacity-50' : 'opacity-60') : ''}`}
                  >
                    <td className="py-4 px-5">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${prioBadge(row.priority)}`}>
                        {row.priority}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>SLA (h):</span>
                            <input
                              type="number" min={1}
                              value={escDraft.slaHours ?? row.slaHours}
                              onChange={e => setEscDraft(d => ({ ...d, slaHours: Number(e.target.value) }))}
                              className={`${inputCls} w-16 text-center`}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Threshold %:</span>
                            <input
                              type="number" min={1} max={100}
                              value={escDraft.threshold ?? row.threshold}
                              onChange={e => setEscDraft(d => ({ ...d, threshold: Number(e.target.value) }))}
                              className={`${inputCls} w-16 text-center`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                            Escalate at {row.threshold}% SLA · {thresholdH.toFixed(1)}h
                          </p>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {row.agentRange} · SLA window: {row.slaHours}h
                          </p>
                        </div>
                      )}
                    </td>

                    <td className={`py-4 px-5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {isEditing ? (
                        <input
                          value={escDraft.trigger ?? row.trigger}
                          onChange={e => setEscDraft(d => ({ ...d, trigger: e.target.value }))}
                          className={`${inputCls} w-full`}
                          placeholder="Trigger description"
                        />
                      ) : row.trigger}
                    </td>

                    <td className={`py-4 px-5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      {isEditing ? (
                        <input
                          value={escDraft.action ?? row.action}
                          onChange={e => setEscDraft(d => ({ ...d, action: e.target.value }))}
                          className={`${inputCls} w-full`}
                          placeholder="Escalation action"
                        />
                      ) : row.action}
                    </td>

                    <td className="py-4 px-5">
                      <button
                        onClick={() => toggleEscActive(i)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          row.active
                            ? isDark ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'bg-green-100 text-green-700 border-green-200 hover:bg-red-100 hover:text-red-700 hover:border-red-200'
                            : isDark ? 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-green-100 hover:text-green-700 hover:border-green-200'
                        }`}
                      >
                        {row.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="py-4 px-5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => saveEsc(i)} className={btnPrimary}><Check size={12} /> Save</button>
                          <button onClick={cancelEsc} className={btnGhost}><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEditEsc(i)} className={btnGhost}><Pencil size={12} /> Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={`flex flex-wrap gap-6 px-5 py-3.5 border-t ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-gray-100 bg-gray-50/50'}`}>
          {escRules.map(row => {
            const thresholdH = (row.threshold / 100) * row.slaHours;
            return (
              <div key={row.priority} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border ${prioBadge(row.priority)}`}>{row.priority}</span>
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  escalates at {thresholdH.toFixed(1)}h ({row.threshold}%)
                </span>
                <span className={`text-xs ${row.active ? (isDark ? 'text-green-500' : 'text-green-600') : (isDark ? 'text-slate-600' : 'text-gray-300')}`}>
                  {row.active ? '●' : '○'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BRANCH MANAGEMENT ── */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h2 className={`text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Map size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Branch Management
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            All registered branches · locations · IT team headcount
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-500'}`}>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">Branch Name</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">Location</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">Agent Seats</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">IT Staff</th>
                <th className="py-3.5 px-5 text-left text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-50'}`}>
              {branchesLoading
                ? loadingRow(5)
                : branches.map(branch => {
                    const dotClass = branch.is_main_branch
                      ? 'bg-blue-500'
                      : 'bg-emerald-500';
                    const agentCount    = branch.agent_count    ?? 0;
                    const itStaffCount  = branch.it_staff_count ?? 0;
                    return (
                      <tr
                        key={branch.id}
                        className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50/80'}`}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${dotClass}`} />
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{branch.name}</span>
                          </div>
                        </td>

                        <td className={`py-4 px-5 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          <div className="flex items-center gap-1.5">
                            <Map size={12} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
                            {branch.location}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            <Users size={13} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
                            <span className="font-medium">{agentCount}</span>
                            <span className={isDark ? 'text-slate-600' : 'text-gray-400'}>agents</span>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                              <Building2 size={13} />
                              <span className="font-medium text-sm">{itStaffCount}</span>
                            </div>
                            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>staff</span>
                            {agentCount > 0 && itStaffCount > 0 && (
                              <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>
                                ({Math.round(agentCount / itStaffCount)} agents/tech)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${
                            branch.is_main_branch
                              ? isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'   : 'bg-blue-100 text-blue-700 border-blue-200'
                              : isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-100 text-green-700 border-green-200'
                          }`}>
                            {branch.is_main_branch ? 'HQ / Central' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        {!branchesLoading && branches.length > 0 && (
          <div className={`flex flex-wrap items-center gap-8 px-5 py-4 border-t ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-gray-100 bg-gray-50/50'}`}>
            <div className="flex items-center gap-2">
              <Building2 size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Total branches:</span>
              <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{branches.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Total agents:</span>
              <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {branches.reduce((s, b) => s + (b.agent_count ?? 0), 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Total IT staff:</span>
              <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {branches.reduce((s, b) => s + (b.it_staff_count ?? 0), 0)}
              </span>
            </div>
            {(() => {
              const totalAgents = branches.reduce((s, b) => s + (b.agent_count ?? 0), 0);
              const totalIT     = branches.reduce((s, b) => s + (b.it_staff_count ?? 0), 0);
              return totalIT > 0 ? (
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Avg agents/tech:</span>
                  <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {Math.round(totalAgents / totalIT)}
                  </span>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* ── SECURITY & INTEGRATIONS ── */}
      <div className={`${card} p-6`}>
        <h2 className={`text-base mb-5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Shield size={18} className={isDark ? 'text-slate-500' : 'text-gray-400'} /> Security &amp; Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'JWT Authentication', status: 'Active',     icon: Shield },
            { label: 'Role-Based Access',  status: 'Enforced',   icon: Globe },
            { label: 'In-App Alerts',      status: 'Connected',  icon: Bell },
            { label: 'REST API',           status: 'Enabled',    icon: Zap },
          ].map(item => (
            <div
              key={item.label}
              className={`flex items-center gap-4 p-4 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}
            >
              <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <item.icon size={16} />
              </div>
              <div className="flex-1">
                <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.label}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
