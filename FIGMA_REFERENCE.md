# FIGMA REFERENCE — IT Helpdesk BPO System
# Source: Figma Make — EbLnZS9UHO0I7a2yBo2JOC
# Purpose: This file tells Claude Code exactly what the Figma prototype
# expects from the Django backend. Every API endpoint, field name, and
# data shape here must match the frontend exactly.

---

## PAGES & THEIR REQUIRED API ENDPOINTS

### 1. LOGIN PAGE (src/pages/Login.tsx)
Fields shown in UI:
- username (text input)
- password (password input)
- branch (dropdown selector)

Required API:
  POST /api/v1/auth/login/
  Request:  { username, password, branch_id }
  Response: {
    access: "<JWT token>",
    refresh: "<JWT token>",
    user: {
      id, username, email, role, shift,
      branch: { id, name, is_main_branch }
    }
  }

---

### 2. DASHBOARD PAGE (src/pages/Dashboard.tsx)

#### Branch IT View (roles: branch_technician, branch_supervisor)
Stats cards shown:
- Open Tickets (count)
- In Progress (count)
- Pending (count)
- Resolved Today (count)
- SLA Compliance % (progress bar)

Sections shown:
- Active Floor-Wide Incidents list
- Tickets by Priority breakdown
- Tickets by Category breakdown
- Current Shift badge (auto-detected from time)

Required API:
  GET /api/v1/dashboard/branch/
  Response: {
    open_count: int,
    in_progress_count: int,
    pending_count: int,
    resolved_today_count: int,
    sla_compliance_pct: float,       // e.g. 87.5
    current_shift: "morning"|"afternoon"|"night",
    active_major_incidents: [
      { id, title, floor_team, status, created_at }
    ],
    tickets_by_priority: {
      critical: int, high: int, medium: int, low: int
    },
    tickets_by_category: {
      voip_dialer: int, crm_software: int,
      workstation: int, network: int, account_access: int
    }
  }

#### Main Branch View (role: main_it_manager)
Stats shown:
- Total Open Across All Branches
- Critical Tickets Systemwide
- Escalations Pending
- Branch comparison table

Required API:
  GET /api/v1/dashboard/main/
  Response: {
    total_open: int,
    critical_systemwide: int,
    escalations_pending: int,
    branches: [
      {
        branch_id: uuid,
        branch_name: str,
        open_tickets: int,
        sla_compliance_pct: float,
        avg_resolution_minutes: float,
        escalated_tickets: int
      }
    ]
  }

---

### 3. TICKETS PAGE (src/pages/Tickets.tsx)
Table columns shown in UI:
- Ticket ID (short UUID prefix)
- Title
- Category
- Priority (badge with color)
- Status (badge)
- Branch
- Agents Affected
- SLA Status (On Track / At Risk / Breached badge)
- Assigned To
- Created At

Filters available:
- Branch (main_it_manager only)
- Shift
- Priority
- Category
- Escalation Status
- Status

Tabs:
- All Tickets
- Floor-Wide Incidents

Required API:
  GET /api/v1/tickets/
  Query params: ?branch=&shift=&priority=&category=&escalated=&status=
  Response: {
    count: int,
    results: [
      {
        id: uuid,
        title: str,
        category: "voip_dialer"|"crm_software"|"workstation"|
                  "network"|"account_access",
        priority: "critical"|"high"|"medium"|"low",
        status: "open"|"in_progress"|"pending"|"resolved",
        branch: { id, name },
        agents_affected: int,
        sla_status: "on_track"|"at_risk"|"breached",
        sla_deadline: datetime,
        assigned_to: { id, username } | null,
        escalated: bool,
        shift: "morning"|"afternoon"|"night",
        created_at: datetime
      }
    ]
  }

  GET /api/v1/incidents/
  Response: {
    results: [
      { id, title, floor_team, branch, status, created_at,
        ticket_count: int }
    ]
  }

---

### 4. CREATE TICKET PAGE (src/pages/CreateTicket.tsx)
Form fields shown in UI:
- title (text)
- description (textarea)
- category (dropdown — 5 BPO categories)
- shift (dropdown — auto-populated by time, editable)
- agents_affected (number input)
- floor_team (text)
- is_floor_wide (toggle/checkbox)
- major_incident (dropdown, shown only if is_floor_wide=true)

Note: priority and assigned_to are NOT shown — they are
auto-calculated by the backend engines after submission.

Required API:
  POST /api/v1/tickets/
  Request: {
    title, description, category, shift,
    agents_affected, floor_team, is_floor_wide,
    major_incident: uuid | null
  }
  Response: Full ticket object (same shape as GET /api/v1/tickets/)

  GET /api/v1/incidents/?status=active
  (Used to populate the major_incident dropdown)

---

### 5. TICKET DETAIL PAGE (src/pages/TicketDetail.tsx)
Sections shown in UI:

Info Panel (read-only):
- title, description, category, priority, status
- branch, submitted_by, assigned_to
- shift, agents_affected, floor_team
- created_at, updated_at

SLA Timer:
- sla_deadline datetime
- time_remaining (calculated on frontend)
- sla_status: "on_track"|"at_risk"|"breached"
- Timer turns red when under 25% time remaining

Status Update (branch_technician and above):
- PATCH /api/v1/tickets/{id}/status/
  Request: { status: "open"|"in_progress"|"pending"|"resolved" }

Assignment (branch_supervisor and above):
- PATCH /api/v1/tickets/{id}/assign/
  Request: { assigned_to: user_id }

Escalation Section:
- escalated: bool (shows badge: Not Escalated / Escalated / Resolved)
- escalated_at: datetime | null
- escalation_reason: str | null
- "Escalate to Main Branch" button
  (disabled if escalated=true, hidden for main_it_manager)

  POST /api/v1/tickets/{id}/escalate/
  Request: { reason: str }
  Response: updated ticket object + escalation_log entry

Required API:
  GET /api/v1/tickets/{id}/
  Response: {
    id, title, description, category, priority, status,
    branch: { id, name },
    submitted_by: { id, username },
    assigned_to: { id, username } | null,
    shift, agents_affected, floor_team, is_floor_wide,
    major_incident: { id, title } | null,
    sla_deadline, sla_status, escalated,
    escalation_log: {
      reason, escalated_by: { username },
      escalated_at, resolved_at, notes
    } | null,
    created_at, updated_at
  }

---

### 6. TEAM MANAGEMENT PAGE (src/pages/TeamManagement.tsx)
Table columns shown:
- Name (username)
- Role
- Branch
- Shift
- Open Tickets (count)

Shift Schedule section:
- Assign technicians to morning / afternoon / night

Required API:
  GET /api/v1/accounts/users/?role=branch_technician,branch_supervisor
  Response: {
    results: [
      {
        id, username, email, role, shift,
        branch: { id, name },
        open_ticket_count: int
      }
    ]
  }

  PATCH /api/v1/accounts/users/{id}/shift/
  Request: { shift: "morning"|"afternoon"|"night" }

---

### 7. USER MANAGEMENT PAGE (src/pages/UserManagement.tsx)
Table columns shown:
- Username
- Email
- Role (badge)
- Branch
- Status (active/inactive)

Required API:
  GET /api/v1/accounts/users/
  POST /api/v1/accounts/users/   (create user)
  PATCH /api/v1/accounts/users/{id}/   (update user)

  User object shape: {
    id, username, email, role, shift,
    branch: { id, name },
    is_active: bool,
    date_joined: datetime
  }

---

### 8. SYSTEM CONFIG PAGE (src/pages/SystemConfig.tsx)
Three sections shown:

Routing Rules table:
- category, keywords (comma-separated), assigned_team_name,
  target_role, branch (null = applies to all), priority_order

  GET /api/v1/routing/rules/
  POST /api/v1/routing/rules/
  PATCH /api/v1/routing/rules/{id}/
  DELETE /api/v1/routing/rules/{id}/

Escalation Rules / SLA Thresholds:
- priority level → hours until breach
- warning threshold (default 75% elapsed)

  GET /api/v1/config/sla/
  PATCH /api/v1/config/sla/

Branch Management table:
- name, location, is_main_branch, IT team count

  GET /api/v1/accounts/branches/
  POST /api/v1/accounts/branches/
  PATCH /api/v1/accounts/branches/{id}/

---

### 9. NOTIFICATIONS PAGE (src/pages/Notifications.tsx)
List items shown:
- notification_type (icon changes per type)
- message (text)
- ticket reference (if applicable)
- is_read (greyed out if read)
- created_at (relative time e.g. "2 mins ago")

Bell icon in header shows unread count badge.

Required API:
  GET /api/v1/notifications/
  Response: {
    unread_count: int,
    results: [
      {
        id, notification_type, message,
        ticket: { id, title } | null,
        is_read, created_at
      }
    ]
  }

  PATCH /api/v1/notifications/{id}/read/
  POST /api/v1/notifications/read-all/

---

## SHARED DATA TYPES (from src/types.ts)

### Priority colors (for badges):
- critical → red (#EF4444)
- high → orange (#F97316)
- medium → yellow (#EAB308)
- low → green (#22C55E)

### Status colors (for badges):
- open → blue (#3B82F6)
- in_progress → indigo (#6366F1)
- pending → amber (#F59E0B)
- resolved → green (#22C55E)

### SLA Status colors:
- on_track → green
- at_risk → orange
- breached → red

### Category display labels:
- voip_dialer → "VoIP & Dialer Issues"
- crm_software → "CRM & Call Center Software"
- workstation → "Workstation & Peripherals"
- network → "Network & Connectivity"
- account_access → "Account & Access Management"

### Role display labels:
- agent → "Agent"
- branch_technician → "Branch IT Technician"
- branch_supervisor → "Branch IT Supervisor"
- main_it_manager → "Main Branch IT Manager"

### Shift times:
- morning → 06:00–14:00
- afternoon → 14:00–22:00
- night → 22:00–06:00

---

## AUTHENTICATION FLOW (from src/context/AuthContext.tsx)

1. User submits login form with username, password, branch_id
2. Frontend sends POST /api/v1/auth/login/
3. Backend returns access + refresh tokens + user object
4. Frontend stores tokens in memory (NOT localStorage per Figma context)
5. All subsequent requests include: Authorization: Bearer <access_token>
6. On 401 response, frontend uses refresh token to get new access token
7. On logout, POST /api/v1/auth/logout/ with refresh token

---

## BRANCH SCOPING RULES (enforced by backend)

- agent: can only see and submit tickets for their own branch
- branch_technician: can see/manage tickets for their own branch only
- branch_supervisor: same as technician + can assign tickets + view reports
- main_it_manager: unrestricted — sees all branches, all tickets,
  all escalations, all reports

All list endpoints must filter by request.user.branch
UNLESS request.user.role == 'main_it_manager'

---

## NOTIFICATIONS TRIGGERED BY BACKEND

| Event | Recipient |
|---|---|
| New ticket assigned | assigned_to technician |
| SLA warning (75% elapsed) | assigned_to + branch_supervisor |
| SLA breached | assigned_to + branch_supervisor + main_it_manager |
| Ticket escalated | all main_it_manager users |
| Escalation resolved | escalated_by user |
| Ticket resolved | submitted_by user |

---

## NOTES FOR CLAUDE CODE

- All UUIDs must be returned as strings in API responses
- All datetimes must be ISO 8601 format with timezone (UTC)
- Pagination: use { count, next, previous, results } envelope
- The frontend uses the 'sla_status' field directly —
  backend must calculate and return it, not the frontend
- The 'shift' field on new tickets should be auto-detected
  by the backend based on submission time if not provided
- Error responses must follow: { error: str, detail: str }
