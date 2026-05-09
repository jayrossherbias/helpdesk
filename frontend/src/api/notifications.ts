import client from './client'
import type { NotificationsResponse } from '../types'

export const getNotifications = () =>
  client.get<NotificationsResponse>('/notifications/').then(r => r.data)

export const markRead = (id: string) =>
  client.patch(`/notifications/${id}/read/`).then(() => undefined)

export const markAllRead = () =>
  client.post('/notifications/read-all/').then(() => undefined)
