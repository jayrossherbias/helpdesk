import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppNotification, Branch, NotificationType } from '../types';
import { useAuth } from './AuthContext';
import {
  getNotifications,
  markRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
} from '../../../api/notifications';

// Map API notification_type → Figma NotificationType
const API_TYPE_TO_FIGMA: Record<string, NotificationType> = {
  ticket_assigned:      'ticket_assigned',
  ticket_resolved:      'ticket_resolved',
  ticket_updated:       'ticket_assigned',
  sla_warning:          'sla_warning',
  sla_breach:           'sla_warning',
  escalation_triggered: 'escalation',
  escalation:           'escalation',
};

function mapApiNotification(n: {
  id: number;
  notification_type: string;
  message: string;
  ticket: { id: string; title: string } | null;
  is_read: boolean;
  created_at: string;
}, userBranch: Branch): AppNotification {
  return {
    id:        String(n.id),
    type:      API_TYPE_TO_FIGMA[n.notification_type] ?? 'ticket_assigned',
    title:     n.notification_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    message:   n.message,
    branch:    userBranch,
    ticketId:  n.ticket?.id ?? '',
    read:      n.is_read,
    createdAt: n.created_at,
  };
}

// ── Context types ──────────────────────────────────────────────
interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: (branch: Branch, isGlobal: boolean) => void;
  dismiss: (id: string) => void;
  slaFired: Set<string>;
  markSLAFired: (ticketId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentAccount } = useAuth();
  const queryClient = useQueryClient();

  // Local-only notifications (fired by TicketContext mutations)
  const [localNotifs, setLocalNotifs] = useState<AppNotification[]>([]);
  const [slaFired, setSlaFired] = useState<Set<string>>(new Set());

  const userBranch = (currentAccount?.branch ?? 'Main Branch') as Branch;

  const { data: apiNotifData } = useQuery({
    queryKey:        ['notifications'],
    queryFn:         getNotifications,
    enabled:         !!currentAccount,
    refetchInterval: 30_000,
  });

  // Merge API notifications with local ones (local first, dedup by id)
  const apiNotifs: AppNotification[] = (apiNotifData?.results ?? []).map(n =>
    mapApiNotification(n, userBranch),
  );

  // Combine: local optimistic notifications + API ones (avoid id duplicates)
  const apiIds = new Set(apiNotifs.map(n => n.id));
  const merged: AppNotification[] = [
    ...localNotifs.filter(n => !apiIds.has(n.id)),
    ...apiNotifs,
  ];

  const addNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      const entry: AppNotification = {
        ...n,
        id:        `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        read:      false,
      };
      setLocalNotifs(prev => [entry, ...prev]);
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    // Optimistic update locally
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // If it's a real API id (numeric string), call the API
    if (!id.startsWith('local-')) {
      apiMarkRead(id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
        .catch(() => {});
    }
  }, [queryClient]);

  const markAllRead = useCallback((_branch: Branch, _isGlobal: boolean) => {
    setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
    apiMarkAllRead()
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => {});
  }, [queryClient]);

  const dismiss = useCallback((id: string) => {
    setLocalNotifs(prev => prev.filter(n => n.id !== id));
    // For API notifications, optimistically remove from view by adding to local dismissed list
    // (full deletion not supported by the backend; just mark as read)
    if (!id.startsWith('local-')) {
      apiMarkRead(id).catch(() => {});
      // Also remove from query cache optimistically
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return { ...old, results: old.results.filter((n: any) => String(n.id) !== id) };
      });
    }
  }, [queryClient]);

  const markSLAFired = useCallback((ticketId: string) => {
    setSlaFired(prev => new Set([...prev, ticketId]));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications: merged, addNotification, markRead, markAllRead, dismiss, slaFired, markSLAFired }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
