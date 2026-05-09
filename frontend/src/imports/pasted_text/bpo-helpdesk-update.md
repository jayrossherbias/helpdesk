Update this IT Helpdesk Ticketing System for a BPO Call Center company with multi-branch support. The system now serves a BPO call center organization with multiple branch offices and one main/central branch. Keep all existing pages and their general layout but apply the following changes throughout:
CONTEXT CHANGE — Beneficiary
Replace all references to a generic academic or office setting with a BPO Call Center environment. Agent downtime means direct revenue loss, so the system is high-stakes and time-sensitive. The system operates 24/7 across three shifts: Morning, Afternoon, and Night.
ARCHITECTURE — Two-Tier Multi-Branch
Add a "Branch" concept to the entire system. Each user, technician, and ticket belongs to a specific branch. Add a branch selector or branch label in the sidebar header below the app title showing the current branch (e.g., "Cebu Branch" or "Main Branch"). There are two tiers: Branch Level (local IT team handles their own tickets) and Main Branch Level (central IT manager sees all branches).
LOGIN PAGE
Add a "Branch" dropdown field to the login form alongside the existing username and password fields. Options: Main Branch, Branch A, Branch B, Branch C (as placeholders). The selected branch determines the user's scope after login.
DASHBOARD PAGE — Branch IT View
Keep the existing stats cards but update labels to: Open Tickets, In Progress, Pending, Resolved Today. Add a "Shift" badge in the top-right header showing the active shift (Morning / Afternoon / Night) based on current time. Add a new "SLA Compliance" gauge or progress bar card showing the percentage of tickets resolved within SLA for the current shift. Add a "Floor-Wide Incidents" section showing any active bulk incidents grouped by affected floor or team.
DASHBOARD PAGE — Main Branch View (new role)
When logged in as Main Branch IT Manager, replace the standard dashboard with a Cross-Branch Overview dashboard. Show a branch comparison table with columns: Branch Name, Open Tickets, SLA Compliance %, Avg Resolution Time, Escalated Tickets. Add a global stats row at the top: Total Open Across All Branches, Critical Tickets Systemwide, Escalations Pending. Add a bar chart comparing ticket volume across branches.
TICKET CATEGORIES — Replace existing categories with these five:

VoIP & Dialer Issues (softphone crashes, call drops, dialer errors)
CRM & Call Center Software (CRM login failures, frozen screens, software errors)
Workstation & Peripherals (headsets, monitors, keyboards, desktop failures)
Network & Connectivity (internet outage, VPN issues, packet loss)
Account & Access Management (password resets, locked accounts, permission requests)

PRIORITY MATRIX — Update the four levels with BPO-specific triggers:

Critical (red): System-wide outage, 20+ agents affected, VoIP completely down
High (orange): 5–19 agents affected, CRM unavailable, network severely degraded
Medium (yellow): 2–4 agents affected, peripheral issues, account lockouts
Low (green): Single agent, cosmetic issues, non-urgent requests

CREATE TICKET PAGE
Add the following new fields to the ticket submission form:

"Number of Agents Affected" (number input) — used by the priority engine
"Shift" (dropdown: Morning / Afternoon / Night) — auto-populated based on current time but editable
"Floor / Team" (text input) — for identifying location of the incident
"Is this a Floor-Wide Incident?" (toggle/checkbox) — if yes, show a "Link to Existing Incident" field
Update the Category dropdown to use the five new BPO categories listed above.
Update the Priority dropdown to use the four updated priority levels.

TICKET DETAIL PAGE
Add a new "Escalation" section below the ticket status area:

An "Escalate to Main Branch" button (visible to branch IT only, disabled if already escalated)
Escalation status badge: Not Escalated / Escalated to Main Branch / Resolved by Main Branch
Escalation timestamp and notes field
Add "Shift" and "Agents Affected" as read-only fields in the ticket info panel.
Add an "SLA Timer" showing time remaining before SLA breach based on priority level (Critical: 1hr, High: 4hr, Medium: 8hr, Low: 24hr). Color the timer red if under 25% remaining.

TICKETS PAGE
Add filter options: by Branch (Main Branch view only), by Shift, by Priority, by Category, by Escalation Status.
Add a column "Agents Affected" to the ticket table.
Add a column "SLA Status" with badge: On Track / At Risk / Breached.
Add a new tab or section called "Floor-Wide Incidents" that lists bulk grouped incidents separately from individual tickets.
TEAM MANAGEMENT PAGE
Add a "Shift Schedule" section where IT technicians are assigned to Morning, Afternoon, or Night shifts.
Add a "Branch" column to the technician table.
Main Branch IT Manager can view technicians from all branches.
USER MANAGEMENT PAGE
Add a "Branch" field to each user profile.
Add a "Role" field with these options: Agent (end-user), Branch IT Technician, Branch IT Supervisor, Main Branch IT Manager.
SYSTEM CONFIG PAGE
Add a "Routing Rules" section showing the rule-based routing table: Category → Assigned Team, with editable keyword triggers per category.
Add an "Escalation Rules" section: define SLA thresholds per priority level that trigger automatic escalation to Main Branch.
Add a "Branch Management" section listing all branches with name, location, and IT team count.
NOTIFICATIONS
Add in-system notification types for: SLA breach warning (at 75% of time elapsed), automatic escalation triggered, new ticket assigned to technician, ticket resolved. Notifications are branch-scoped except for the Main Branch IT Manager who sees all.
GLOBAL STYLE
Keep the existing color scheme and sidebar layout. Add a subtle branch color indicator in the sidebar (a colored dot or accent) that changes per branch for quick visual identification. Keep all existing routing, auth context, and ticket context — extend them with branch, shift, agents affected, escalation status, and floor/team fields.