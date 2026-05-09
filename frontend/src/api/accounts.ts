import client from './client'
import type { PaginatedResponse } from '../types'
import type { Branch, UserProfile } from './auth'

export const getBranches = () =>
  client.get<PaginatedResponse<Branch>>('/accounts/branches/').then(r => r.data.results)

export const getUsers = (roles?: string[]) =>
  client.get<PaginatedResponse<UserProfile>>('/accounts/users/', {
    params: roles?.length ? { role: roles.join(',') } : undefined,
  }).then(r => r.data.results)

export const updateUserShift = (id: number, shift: string) =>
  client.patch<UserProfile>(`/accounts/users/${id}/shift/`, { shift }).then(r => r.data)
