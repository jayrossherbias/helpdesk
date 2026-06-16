import axios from 'axios'
import client, { clearTokens, getRefreshToken, setTokens } from './client'

export interface Branch {
  id: string
  name: string
  location: string
  is_main_branch: boolean
  agent_count?: number
  it_staff_count?: number
}

export interface UserProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: 'agent' | 'branch_technician' | 'branch_supervisor' | 'main_it_manager'
  shift: 'morning' | 'afternoon' | 'night' | null
  department: 'it_department' | 'sales' | 'customer_service' | 'collections' | 'technical_support' | 'quality_assurance' | 'back_office' | null
  branch: Branch | null
  is_active: boolean
  date_joined: string
  open_ticket_count: number
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const { data } = await client.post<{
    access: string
    refresh: string
    user: UserProfile
  }>('/auth/login/', { email, password })

  setTokens(data.access, data.refresh)
  return data.user
}

export async function googleLogin(credential: string): Promise<UserProfile> {
  const { data } = await client.post<{
    access: string
    refresh: string
    user: UserProfile
  }>('/auth/google-login/', { credential })

  setTokens(data.access, data.refresh)
  return data.user
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken()
  if (refresh) {
    try {
      await client.post('/auth/logout/', { refresh })
    } catch {
      // Blacklisting failed — still clear local tokens
    }
  }
  clearTokens()
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await client.get<UserProfile>('/auth/me/')
  return data
}

export async function updateMe(data: {
  first_name?: string
  last_name?: string
  current_password?: string
  new_password?: string
}): Promise<UserProfile> {
  const { data: profile } = await client.patch<UserProfile>('/auth/me/', data)
  return profile
}

export async function restoreSession(): Promise<UserProfile | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const base = (client.defaults.baseURL ?? 'http://localhost:8000/api/v1') as string
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${base}/auth/token/refresh/`,
      { refresh },
    )
    setTokens(data.access, data.refresh ?? refresh)
    return getMe()
  } catch {
    clearTokens()
    return null
  }
}
