export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'In Progress' | 'Resolved';
export type Category =
  | 'VoIP & Dialer Issues'
  | 'CRM & Call Center Software'
  | 'Workstation & Peripherals'
  | 'Network & Connectivity'
  | 'Account & Access Management';
export type Role = 'Agent (end-user)' | 'Branch IT Technician' | 'Branch IT Supervisor' | 'Main Branch IT Supervisor' | 'Main Branch IT Manager';
export type Department =
  | 'it_department'
  | 'sales'
  | 'customer_service'
  | 'collections'
  | 'technical_support'
  | 'quality_assurance'
  | 'back_office';
export type Branch =
  | 'Main Branch'
  | 'Victorias Branch'
  | 'Bacolod Branch'
  | 'Cebu Branch';
export type Shift = 'Morning' | 'Afternoon' | 'Night';
export type EscalationStatus = 'Not Escalated' | 'Escalated' | 'Resolved by Main Branch';

export const BRANCHES: Branch[] = [
  'Main Branch', 'Victorias Branch', 'Bacolod Branch', 'Cebu Branch',
];

export const BRANCH_CONFIG: Record<Branch, { dotClass: string; color: string; label: string }> = {
  'Main Branch':      { dotClass: 'bg-blue-500',    color: '#3b82f6', label: 'Main Branch' },
  'Victorias Branch': { dotClass: 'bg-emerald-500', color: '#10b981', label: 'Victorias Branch' },
  'Bacolod Branch':   { dotClass: 'bg-purple-500',  color: '#a855f7', label: 'Bacolod Branch' },
  'Cebu Branch':      { dotClass: 'bg-orange-500',  color: '#f97316', label: 'Cebu Branch' },
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

export type Urgency =
  | 'cannot_work'
  | 'severely_impacted'
  | 'partially_impacted'
  | 'minor_issue';

export const URGENCY_META: Record<Urgency, { label: string; short: string; color: string; lightColor: string }> = {
  cannot_work:        { label: 'Cannot work — completely blocked',            short: 'Cannot Work',        color: 'text-red-400',    lightColor: 'text-red-700'    },
  severely_impacted:  { label: 'Severely impacted — major disruption',        short: 'Severely Impacted',  color: 'text-orange-400', lightColor: 'text-orange-700' },
  partially_impacted: { label: 'Partially impacted — working with difficulty', short: 'Partially Impacted', color: 'text-yellow-400', lightColor: 'text-yellow-700' },
  minor_issue:        { label: 'Minor issue — slight inconvenience',           short: 'Minor Issue',        color: 'text-slate-400',  lightColor: 'text-gray-600'   },
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  it_department:    'IT Department',
  sales:            'Sales',
  customer_service: 'Customer Service',
  collections:      'Collections',
  technical_support: 'Technical Support',
  quality_assurance: 'Quality Assurance',
  back_office:      'Back Office',
};

export const DEPARTMENT_CODES: Record<Department, string> = {
  it_department:    'IT',
  sales:            'SLS',
  customer_service: 'CS',
  collections:      'COL',
  technical_support: 'TS',
  quality_assurance: 'QA',
  back_office:      'BO',
};

export interface RelatedTicketRef {
  id: string;
  ticketNumber: string | null;
  title: string;
  category: string;
  status: string;
}

export interface Ticket {
  id: string;
  ticket_number: string | null;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  urgency: Urgency;
  assignee: string;
  creator: string;
  branch: Branch;
  shift: Shift;
  agentsAffected: number;
  floor: string;
  isFloorWide: boolean;
  linkedIncident?: string;
  relatedTo: RelatedTicketRef | null;
  followUps: RelatedTicketRef[];
  escalationStatus: EscalationStatus;
  escalatedAt?: string;
  escalationNotes?: string;
  resolutionNotes: string;
  slaStatus: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  history: TicketHistory[];
}

export interface User {
  id: string;
  name: string;
  role: Role;
  branch: Branch;
  department: Department | null;
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