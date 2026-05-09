import client, { clearTokens, getRefreshToken, setTokens } from './client'

export interface Branch {
  id: string
  name: string
  location: string
  is_main_branch: boolean
}

export interface UserProfile {
  id: number
  username: string
  email: string
  role: 'agent' | 'branch_technician' | 'branch_supervisor' | 'main_it_manager'
  shift: 'morning' | 'afternoon' | 'night' | null
  branch: Branch | null
  is_active: boolean
  date_joined: string
  open_ticket_count: number
}

export async function login(username: string, password: string): Promise<UserProfile> {
  const { data } = await client.post<{
    access: string
    refresh: string
    user: UserProfile
  }>('/auth/login/', { username, password })

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
