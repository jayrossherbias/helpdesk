import client from './client'
import type { MajorIncident, PaginatedResponse, Ticket } from '../types'

export interface TicketFilters {
  branch?: string
  shift?: string
  priority?: string
  category?: string
  escalated?: boolean
  status?: string
}

export const getTickets = (filters?: TicketFilters) =>
  client.get<PaginatedResponse<Ticket>>('/tickets/', { params: filters }).then(r => r.data)

export const getTicket = (id: string) =>
  client.get<Ticket>(`/tickets/${id}/`).then(r => r.data)

export interface CreateTicketData {
  title: string
  description: string
  category: string
  shift: string
  agents_affected: number
  floor_team: string
  is_floor_wide: boolean
  urgency: string
  major_incident: string | null
  related_ticket_number?: string
}

export const createTicket = (data: CreateTicketData) =>
  client.post<Ticket>('/tickets/', data).then(r => r.data)

export const updateTicketStatus = (id: string, status: string) =>
  client.patch<Ticket>(`/tickets/${id}/status/`, { status }).then(r => r.data)

export const updateTicketPriority = (id: string, priority: string) =>
  client.patch<Ticket>(`/tickets/${id}/priority/`, { priority }).then(r => r.data)

export const updateResolutionNotes = (id: string, resolution_notes: string) =>
  client.patch<Ticket>(`/tickets/${id}/resolution/`, { resolution_notes }).then(r => r.data)

export const assignTicket = (id: string, userId: number) =>
  client.patch<Ticket>(`/tickets/${id}/assign/`, { assigned_to: userId }).then(r => r.data)

export const escalateTicket = (id: string, reason: string) =>
  client.post<Ticket>(`/tickets/${id}/escalate/`, { reason }).then(r => r.data)

export const markFloorWide = (id: string, floorTeam?: string) =>
  client.patch<Ticket>(`/tickets/${id}/flag-floor-wide/`, { floor_team: floorTeam ?? '' }).then(r => r.data)

export const resolveEscalationApi = (id: string) =>
  client.patch<Ticket>(`/tickets/${id}/resolve-escalation/`).then(r => r.data)

export interface ShiftHandoverResult {
  reassigned_count: number
  new_assignee: string
  new_assignee_full_name: string
  current_shift: string
}

export const shiftHandover = (excludedTicketIds: string[] = []) =>
  client.post<ShiftHandoverResult>('/tickets/shift-handover/', { excluded_ticket_ids: excludedTicketIds }).then(r => r.data)

export const getIncidents = (status?: string) =>
  client.get<PaginatedResponse<MajorIncident>>('/incidents/', {
    params: status ? { status } : undefined,
  }).then(r => r.data)

export interface SystemSettings {
  auto_routing: boolean
  auto_priority: boolean
  email_notifications: boolean
  sla_alerts: boolean
}

export const getSystemSettings = () =>
  client.get<SystemSettings>('/tickets/settings/').then(r => r.data)

export const patchSystemSettings = (data: Partial<SystemSettings>) =>
  client.patch<SystemSettings>('/tickets/settings/', data).then(r => r.data)
