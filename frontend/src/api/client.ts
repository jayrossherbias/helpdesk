import axios, { type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

// ── Token store — access in memory, refresh persisted to localStorage ─────────
const REFRESH_KEY = 'helpdesk_rt'

let accessToken: string | null = null
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY)

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshToken
}

// ── Axios instance ────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach Bearer token
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response interceptor — refresh on 401, retry once
let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function drainQueue(token: string | null, err: unknown) {
  pendingQueue.forEach(({ resolve, reject }) =>
    token ? resolve(token) : reject(err),
  )
  pendingQueue = []
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    const status = error.response?.status
    if (status !== 401 || original._retried) {
      if (status === 403) {
        toast.error('You do not have permission for this action.')
      } else if (status === 404) {
        toast.error('Resource not found.')
      } else if (status != null && status >= 500) {
        toast.error('Server error — please try again.')
      }
      return Promise.reject(error)
    }

    if (!refreshToken) {
      clearTokens()
      // Don't redirect on auth endpoints themselves (login, google-login, etc.)
      const isAuthEndpoint = original.url?.includes('/auth/')
      if (!isAuthEndpoint && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return client(original)
      })
    }

    original._retried = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${client.defaults.baseURL}/auth/token/refresh/`,
        { refresh: refreshToken },
      )
      setTokens(data.access, data.refresh ?? refreshToken!)
      drainQueue(data.access, null)
      original.headers.Authorization = `Bearer ${data.access}`
      return client(original)
    } catch (refreshError) {
      drainQueue(null, refreshError)
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default client
