export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'In Progress' | 'Resolved';
export type Category =
  | 'VoIP & Dialer Issues'
  | 'CRM & Call Center Software'
  | 'Workstation & Peripherals'
  | 'Network & Connectivity'
  | 'Account & Access Management';
export type Role = 'Agent (end-user)' | 'Branch IT Technician' | 'Branch IT Supervisor' | 'Main Branch IT Manager';
export type Branch =
  | 'Main Branch'
  | 'Cebu Branch'
  | 'Davao Branch'
  | 'Manila Branch'
  | 'Makati Branch'
  | 'BGC Branch';
export type Shift = 'Morning' | 'Afternoon' | 'Night';
export type EscalationStatus = 'Not Escalated' | 'Escalated' | 'Resolved by Main Branch';

export const BRANCHES: Branch[] = [
  'Main Branch', 'Cebu Branch', 'Davao Branch', 'Manila Branch', 'Makati Branch', 'BGC Branch',
];

export const BRANCH_CONFIG: Record<Branch, { dotClass: string; color: string; label: string }> = {
  'Main Branch':   { dotClass: 'bg-blue-500',    color: '#3b82f6', label: 'Main Branch' },
  'Cebu Branch':   { dotClass: 'bg-emerald-500', color: '#10b981', label: 'Cebu Branch' },
  'Davao Branch':  { dotClass: 'bg-orange-500',  color: '#f97316', label: 'Davao Branch' },
  'Manila Branch': { dotClass: 'bg-purple-500',  color: '#a855f7', label: 'Manila Branch' },
  'Makati Branch': { dotClass: 'bg-rose-500',    color: '#f43f5e', label: 'Makati Branch' },
  'BGC Branch':    { dotClass: 'bg-cyan-500',    color: '#06b6d4', label: 'BGC Branch' },
};

export const BPO_CATEGORIES: Category[] = [
  'VoIP & Dialer Issues',
  'CRM & Call Center Software',
  'Workstation & Peripherals',
  'Network & Connectivity',
  'Account & Access Management',
];

export const SLA_HOURS: Record<Priority, number> = {
  Critical: 1,
  High: 4,
  Medium: 8,
  Low: 24,
};

export const PRIORITY_TRIGGERS: Record<Priority, { trigger: string; agentRange: string }> = {
  Critical: { trigger: 'System-wide outage · VoIP completely down',          agentRange: '20+ agents affected' },
  High:     { trigger: 'CRM unavailable · Network severely degraded',         agentRange: '5–19 agents affected' },
  Medium:   { trigger: 'Peripheral issues · Account lockouts',                agentRange: '2–4 agents affected' },
  Low:      { trigger: 'Cosmetic issues · Non-urgent requests',               agentRange: 'Single agent affected' },
};

export interface TicketHistory {
  id: string;
  action: string;
  timestamp: string;
  actor: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  assignee: string;
  creator: string;
  branch: Branch;
  shift: Shift;
  agentsAffected: number;
  floor: string;
  isFloorWide: boolean;
  linkedIncident?: string;
  escalationStatus: EscalationStatus;
  escalatedAt?: string;
  escalationNotes?: string;
  createdAt: string;
  updatedAt: string;
  history: TicketHistory[];
}

export interface User {
  id: string;
  name: string;
  role: Role;
  branch: Branch;
}

// ── Notification system ───────────────────────────────────────
export type NotificationType =
  | 'sla_warning'
  | 'escalation'
  | 'ticket_assigned'
  | 'ticket_resolved';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  branch: Branch;
  ticketId: string;
  priority?: Priority;
  read: boolean;
  createdAt: string;
}

export const getActiveShift = (): Shift => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Morning';
  if (hour >= 14 && hour < 22) return 'Afternoon';
  return 'Night';
};