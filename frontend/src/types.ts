export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface BranchRef {
  id: string
  name: string
  location?: string
  is_main_branch?: boolean
}

export type Department =
  | 'it_department'
  | 'sales'
  | 'customer_service'
  | 'collections'
  | 'technical_support'
  | 'quality_assurance'
  | 'back_office'

export const DEPARTMENT_LABELS: Record<Department, string> = {
  it_department:    'IT Department',
  sales:            'Sales',
  customer_service: 'Customer Service',
  collections:      'Collections',
  technical_support: 'Technical Support',
  quality_assurance: 'Quality Assurance',
  back_office:      'Back Office',
}

export interface UserRef {
  id: number
  username: string
  display_name?: string
  email?: string
}

export interface UserProfile extends UserRef {
  first_name: string
  last_name: string
  role: string
  shift: string | null
  department: Department | null
  branch: BranchRef | null
  is_active: boolean
  date_joined: string
  open_ticket_count: number
}

export interface EscalationLog {
  reason: string
  escalated_by: UserRef
  escalated_at: string
  resolved_at: string | null
  notes: string
}

export interface TicketLogEntry {
  id: string
  action: string
  actor: string
  created_at: string
}

export interface RelatedTicketRef {
  id: string
  ticket_number: string | null
  title: string
  category: string
  status: string
}

export interface Ticket {
  id: string
  ticket_number: string | null
  title: string
  description: string
  category: string
  priority: string
  status: string
  urgency: string
  branch: BranchRef
  submitted_by: UserRef | null
  assigned_to: UserRef | null
  shift: string
  agents_affected: number
  floor_team: string
  is_floor_wide: boolean
  escalated: boolean
  escalation_resolved?: boolean
  escalation_logs: EscalationLog[]
  escalation_log?: EscalationLog | null
  logs?: TicketLogEntry[]
  sla_status: string
  sla_deadline: string | null
  resolved_at: string | null
  resolution_notes: string
  major_incident: string | null
  related_to: RelatedTicketRef | null
  follow_ups?: RelatedTicketRef[]
  created_at: string
  updated_at: string
}

export interface MajorIncident {
  id: string
  title: string
  floor_team: string
  branch: BranchRef
  status: string
  created_at: string
  ticket_count: number
}

export interface ApiNotification {
  id: number
  notification_type: string
  message: string
  ticket: { id: string; title: string } | null
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  unread_count: number
  results: ApiNotification[]
}

export interface RoutingRule {
  id: string
  category: string
  keywords: string
  assigned_team_name: string
  target_role: string
  branch: string | null
  priority_order: number
}

export interface SlaConfig {
  critical_hours: number
  high_hours: number
  medium_hours: number
  low_hours: number
  warning_threshold_pct: number
}

export interface BranchStats {
  branch_id: string
  branch_name: string
  open_tickets: number
  sla_compliance_pct: number
  avg_resolution_minutes: number
  escalated_tickets: number
}

export interface BranchDashboard {
  open_count: number
  in_progress_count: number
  pending_count: number
  resolved_today_count: number
  sla_compliance_pct: number
  current_shift: string
  active_major_incidents: Array<{
    id: string
    title: string
    floor_team: string
    status: string
    created_at: string
  }>
  tickets_by_priority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  tickets_by_category: {
    voip_dialer: number
    crm_software: number
    workstation: number
    network: number
    account_access: number
  }
}

export interface MainDashboard {
  total_open: number
  critical_systemwide: number
  escalations_pending: number
  branches: BranchStats[]
}
