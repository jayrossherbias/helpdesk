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

export const createUser = (data: {
  first_name: string
  email: string
  password: string
  role: string
  shift: string | null
  branch: string
  is_active: boolean
}) => client.post<UserProfile>('/accounts/users/', data).then(r => r.data)

export const patchUser = (id: string, data: Partial<{
  first_name: string
  last_name: string
  email: string
  role: string
  shift: string | null
  is_active: boolean
}>) => client.patch<UserProfile>(`/accounts/users/${id}/`, data).then(r => r.data)
