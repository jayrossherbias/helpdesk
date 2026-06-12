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

export const assignTicket = (id: string, userId: number) =>
  client.patch<Ticket>(`/tickets/${id}/assign/`, { assigned_to: userId }).then(r => r.data)

export const escalateTicket = (id: string, reason: string) =>
  client.post<Ticket>(`/tickets/${id}/escalate/`, { reason }).then(r => r.data)

export const markFloorWide = (id: string, floorTeam?: string) =>
  client.patch<Ticket>(`/tickets/${id}/flag-floor-wide/`, { floor_team: floorTeam ?? '' }).then(r => r.data)

export const getIncidents = (status?: string) =>
  client.get<PaginatedResponse<MajorIncident>>('/incidents/', {
    params: status ? { status } : undefined,
  }).then(r => r.data)
