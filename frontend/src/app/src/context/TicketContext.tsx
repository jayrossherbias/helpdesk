import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import {
  Ticket, Category, Priority, Status, TicketHistory, Shift, EscalationStatus,
} from '../types';
import type { Ticket as ApiTicket } from '../../../types';
import {
  getTickets,
  getTicket as apiGetTicket,
  createTicket as apiCreateTicket,
  updateTicketStatus as apiUpdateTicketStatus,
  escalateTicket as apiEscalateTicket,
} from '../../../api/tickets';

// ── Adapter maps ───────────────────────────────────────────────
const API_PRIORITY_TO_FIGMA: Record<string, Priority> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
};
const API_STATUS_TO_FIGMA: Record<string, Status> = {
  open: 'Open', in_progress: 'In Progress', pending: 'In Progress', resolved: 'Resolved',
};
const API_CATEGORY_TO_FIGMA: Record<string, Category> = {
  voip_dialer:    'VoIP & Dialer Issues',
  crm_software:   'CRM & Call Center Software',
  workstation:    'Workstation & Peripherals',
  network:        'Network & Connectivity',
  account_access: 'Account & Access Management',
};
const API_SHIFT_TO_FIGMA: Record<string, Shift> = {
  morning: 'Morning', afternoon: 'Afternoon', night: 'Night',
};

const FIGMA_CATEGORY_TO_API: Record<Category, string> = {
  'VoIP & Dialer Issues':        'voip_dialer',
  'CRM & Call Center Software':  'crm_software',
  'Workstation & Peripherals':   'workstation',
  'Network & Connectivity':      'network',
  'Account & Access Management': 'account_access',
};
const FIGMA_SHIFT_TO_API: Record<Shift, string> = {
  Morning: 'morning', Afternoon: 'afternoon', Night: 'night',
};
const FIGMA_STATUS_TO_API: Record<Status, string> = {
  Open: 'open', 'In Progress': 'in_progress', Resolved: 'resolved',
};

function mapApiTicket(t: ApiTicket): Ticket {
  const escalationLog = (t.escalation_logs?.[0]) ?? t.escalation_log ?? null;
  return {
    id:             t.id,
    title:          t.title,
    description:    t.description,
    category:       API_CATEGORY_TO_FIGMA[t.category] ?? 'VoIP & Dialer Issues',
    priority:       API_PRIORITY_TO_FIGMA[t.priority] ?? 'Low',
    status:         API_STATUS_TO_FIGMA[t.status] ?? 'Open',
    assignee:       t.assigned_to?.username ?? 'Unassigned',
    creator:        t.created_by?.username ?? 'Unknown',
    branch:         (t.branch?.name ?? 'Main Branch') as any,
    shift:          API_SHIFT_TO_FIGMA[t.shift] ?? 'Morning',
    agentsAffected: t.agents_affected,
    floor:          t.floor_team,
    isFloorWide:    t.is_floor_wide,
    escalationStatus: t.escalated
      ? (escalationLog?.resolved_at ? 'Resolved by Main Branch' : 'Escalated')
      : 'Not Escalated',
    escalatedAt:    escalationLog?.escalated_at,
    escalationNotes: escalationLog?.reason,
    createdAt:      t.created_at,
    updatedAt:      t.updated_at,
    history:        [] as TicketHistory[],
  };
}

// ── Context type ───────────────────────────────────────────────
interface TicketContextType {
  tickets: Ticket[];
  currentUser: { id: string; name: string; role: any; branch: any };
  createTicket: (
    title: string,
    description: string,
    category: Category,
    agentsAffected: number,
    shift: Shift,
    floor: string,
    isFloorWide: boolean,
    priorityOverride?: Priority,
    linkedIncident?: string
  ) => void;
  updateTicketStatus: (id: string, status: Status) => void;
  updateTicketPriority: (id: string, priority: Priority) => void;
  assignTicket: (id: string, assignee: string) => void;
  escalateTicket: (id: string, notes: string) => void;
  resolveEscalation: (id: string) => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentAccount } = useAuth();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const currentUser = currentAccount
    ? { id: currentAccount.id, name: currentAccount.name, role: currentAccount.role, branch: currentAccount.branch }
    : { id: '', name: '', role: 'Agent (end-user)' as any, branch: 'Main Branch' as any };

  // ── Tickets query ──────────────────────────────────────────
  const { data: apiTickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn:  async () => {
      const res = await getTickets({ page_size: 200 } as any);
      return res.results;
    },
    enabled:        !!currentAccount,
    refetchInterval: 60_000,
  });

  const tickets: Ticket[] = apiTickets.map(mapApiTicket);

  // ── Mutations ──────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tickets'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiUpdateTicketStatus(id, status),
    onSuccess: (updated, { id, status }) => {
      invalidate();
      toast.success(`Ticket marked as ${status}`);
      if (status === 'resolved') {
        const t = tickets.find(tk => tk.id === id);
        if (t) {
          addNotification({
            type: 'ticket_resolved',
            title: `Ticket Resolved — ${id}`,
            message: `${t.title} resolved by ${currentUser.name}.`,
            branch: t.branch,
            ticketId: id,
            priority: t.priority,
          });
        }
      }
    },
    onError: () => toast.error('Failed to update ticket status.'),
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiEscalateTicket(id, reason),
    onSuccess: (_, { id, reason }) => {
      invalidate();
      toast.warning(`Ticket ${id} escalated to Main Branch`);
      const t = tickets.find(tk => tk.id === id);
      if (t) {
        addNotification({
          type: 'escalation',
          title: `Escalation Triggered — ${id}`,
          message: `${t.title} escalated by ${currentUser.name}. ${reason}`,
          branch: t.branch,
          ticketId: id,
          priority: t.priority,
        });
      }
    },
    onError: () => toast.error('Failed to escalate ticket.'),
  });

  // ── Context methods ────────────────────────────────────────
  const createTicket = async (
    title: string,
    description: string,
    category: Category,
    agentsAffected: number,
    shift: Shift,
    floor: string,
    isFloorWide: boolean,
    _priorityOverride?: Priority,
    linkedIncident?: string,
  ) => {
    try {
      const created = await apiCreateTicket({
        title,
        description,
        category:       FIGMA_CATEGORY_TO_API[category],
        shift:          FIGMA_SHIFT_TO_API[shift],
        agents_affected: agentsAffected,
        floor_team:     floor,
        is_floor_wide:  isFloorWide,
        major_incident: linkedIncident ?? null,
      });
      await invalidate();
      const mappedTicket = mapApiTicket(created as ApiTicket);
      addNotification({
        type:     'ticket_assigned',
        title:    `New Ticket — ${created.id.slice(0, 8)}`,
        message:  `${title} submitted. Priority: ${mappedTicket.priority}. Assigned: ${mappedTicket.assignee}.`,
        branch:   currentUser.branch,
        ticketId: created.id,
        priority: mappedTicket.priority,
      });
      toast.success('Ticket submitted successfully!');
      setTimeout(() => {
        toast.info(`Auto-routed to ${mappedTicket.assignee} · ${mappedTicket.priority} priority`, {
          description: `Shift: ${shift} | ${agentsAffected} agent(s) affected${isFloorWide ? ' | Floor-wide incident' : ''}`,
        });
        if (mappedTicket.priority === 'Critical') {
          setTimeout(() => {
            toast.warning('CRITICAL ticket detected — supervisor notified immediately.', {
              description: 'Direct revenue impact. SLA: 1 hour.',
            });
          }, 800);
        }
      }, 1000);
    } catch {
      toast.error('Failed to submit ticket. Please try again.');
    }
  };

  const updateTicketStatus = (id: string, status: Status) => {
    statusMutation.mutate({ id, status: FIGMA_STATUS_TO_API[status] });
  };

  const updateTicketPriority = (_id: string, priority: Priority) => {
    toast.info(`Priority update to ${priority} — no backend endpoint available.`);
  };

  const assignTicket = (_id: string, assignee: string) => {
    toast.info(`Assign to "${assignee}" — backend requires a numeric user ID. Use the detail page.`);
  };

  const escalateTicket = (id: string, notes: string) => {
    escalateMutation.mutate({ id, reason: notes });
  };

  const resolveEscalation = (id: string) => {
    statusMutation.mutate({ id, status: 'resolved' });
  };

  return (
    <TicketContext.Provider value={{
      tickets,
      currentUser,
      createTicket,
      updateTicketStatus,
      updateTicketPriority,
      assignTicket,
      escalateTicket,
      resolveEscalation,
    }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) throw new Error('useTickets must be used within a TicketProvider');
  return context;
};
