import client from './client'
import type { PaginatedResponse, RoutingRule, SlaConfig } from '../types'

export const getRules = () =>
  client.get<PaginatedResponse<RoutingRule>>('/routing/rules/').then(r => r.data.results)

export const createRule = (data: Omit<RoutingRule, 'id'>) =>
  client.post<RoutingRule>('/routing/rules/', data).then(r => r.data)

export const updateRule = (id: string, data: Partial<Omit<RoutingRule, 'id'>>) =>
  client.patch<RoutingRule>(`/routing/rules/${id}/`, data).then(r => r.data)

export const deleteRule = (id: string) =>
  client.delete(`/routing/rules/${id}/`).then(() => undefined)

export const getSLAConfig = () =>
  client.get<SlaConfig>('/config/sla/').then(r => r.data)
