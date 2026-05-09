# IT Helpdesk Ticketing System — BPO Call Center

## Project Overview
IT Helpdesk Ticketing System with Automated Ticket Routing and Prioritization
for a multi-branch BPO Call Center company. Developed as an academic project
under an Agile SDLC within a 12-week semester.

## Tech Stack
- Backend: Python 3.11, Django, Django REST Framework (DRF)
- Frontend: React.js with HTML, CSS, JavaScript
- Database: Supabase (PostgreSQL)
- IDE: Visual Studio Code
- Version Control: GitHub

## Architecture
Two-tier multi-branch system:
- Branch Level: local IT team manages their own tickets
- Main Branch Level: central IT manager sees all branches and escalations

## Database Rules
- Use Supabase (PostgreSQL) exclusively — never SQLite
- Connect via DATABASE_URL environment variable using dj-database-url
- Use psycopg2-binary as the PostgreSQL adapter
- Use Django ORM for ALL database operations — never raw SQL
- All secrets (DATABASE_URL, SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
  must live in .env — never hardcoded

## API Rules
- All endpoints follow RESTful conventions under /api/v1/
- Use Django REST Framework for all API views
- Use JWT authentication (djangorestframework-simplejwt)
- All responses in JSON format
- Branch-scoped data: users only see data from their own branch
  except Main Branch IT Manager who sees all

## Routing & Priority Rules
- ALL routing and prioritization logic is rule-based only
- No ML, AI, or external scoring libraries (no scikit-learn, tensorflow, etc.)
- Routing engine: matches ticket category + keywords → assigns team
- Priority engine: uses agents_affected count + category → assigns level

## Ticket Categories
1. voip_dialer — VoIP & Dialer Issues
2. crm_software — CRM & Call Center Software
3. workstation — Workstation & Peripherals
4. network — Network & Connectivity
5. account_access — Account & Access Management

## Priority Levels
- critical — 20+ agents affected or system-wide outage
- high — 5 to 19 agents affected
- medium — 2 to 4 agents affected
- low — single agent, non-urgent

## SLA Deadlines (from ticket creation)
- Critical: 1 hour
- High: 4 hours
- Medium: 8 hours
- Low: 24 hours

## Shift Schedule
- morning: 6:00 AM – 2:00 PM
- afternoon: 2:00 PM – 10:00 PM
- night: 10:00 PM – 6:00 AM

## Key Django Apps to Build
- accounts — user auth, roles, branch assignment
- tickets — ticket model, lifecycle, categories
- routing — rule-based routing engine
- priority — priority matrix engine
- incidents — floor-wide major incidents
- escalations — escalation workflow and logs
- notifications — in-system notifications
- dashboard — reporting and analytics views

## User Roles
- agent — end-user, submits tickets only
- branch_technician — handles tickets within their branch
- branch_supervisor — monitors branch queue and SLA
- main_it_manager — full access across all branches

## Do Not
- Never use SQLite
- Never hardcode credentials
- Never install ML/AI libraries
- Never break existing migrations without confirming first
- Never write raw SQL — use Django ORM

## Design Reference
See FIGMA_REFERENCE.md for all API contracts, field names, response
shapes, and data types derived from the Figma prototype.