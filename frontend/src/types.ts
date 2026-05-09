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

export interface UserRef {
  id: number
  username: string
  email?: string
}

export interface EscalationLog {
  reason: string
  escalated_by: UserRef
  escalated_at: string
  resolved_at: string | null
  notes: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  branch: BranchRef
  created_by: UserRef
  assigned_to: UserRef | null
  shift: string
  agents_affected: number
  floor_team: string
  is_floor_wide: boolean
  escalated: boolean
  escalation_logs: EscalationLog[]
  escalation_log?: EscalationLog | null
  sla_status: string
  sla_deadline: string | null
  major_incident: string | null
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
