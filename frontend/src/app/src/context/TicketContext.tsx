import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import {
  Ticket, Category, Priority, Status, TicketHistory, Shift, EscalationStatus, Urgency,
  RelatedTicketRef,
} from '../types';
import type { Ticket as ApiTicket } from '../../../types';
import {
  getTickets,
  getTicket as apiGetTicket,
  createTicket as apiCreateTicket,
  updateTicketStatus as apiUpdateTicketStatus,
  updateTicketPriority as apiUpdateTicketPriority,
  updateResolutionNotes as apiUpdateResolutionNotes,
  escalateTicket as apiEscalateTicket,
  markFloorWide as apiMarkFloorWide,
  resolveEscalationApi,
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

  // Prefer server-side audit logs; fall back to a synthetic timeline for older tickets
  let history: TicketHistory[];
  if (t.logs && t.logs.length > 0) {
    history = t.logs.map(l => ({
      id:        l.id,
      action:    l.action,
      timestamp: l.created_at,
      actor:     l.actor,
    }));
  } else {
    // Derive a minimal timeline from available ticket fields
    history = [];
    const submitter = t.submitted_by?.display_name ?? t.submitted_by?.username ?? 'Unknown';
    history.push({ id: `${t.id}-created`, action: `Ticket submitted by ${submitter}.`, timestamp: t.created_at, actor: submitter });
    if (t.assigned_to) {
      const assigneeName = t.assigned_to.display_name ?? t.assigned_to.username;
      history.push({ id: `${t.id}-assigned`, action: `Auto-assigned to ${assigneeName} by routing engine.`, timestamp: t.created_at, actor: 'System' });
    }
    if (escalationLog) {
      history.push({ id: `${t.id}-escalated`, action: `Escalated to Main Branch · Reason: ${escalationLog.reason}`, timestamp: escalationLog.escalated_at, actor: escalationLog.escalated_by?.username ?? 'Unknown' });
      if (escalationLog.resolved_at) {
        history.push({ id: `${t.id}-esc-resolved`, action: 'Escalation resolved by Main Branch.', timestamp: escalationLog.resolved_at, actor: 'Main Branch' });
      }
    }
    if (t.status === 'resolved' && t.updated_at !== t.created_at) {
      history.push({ id: `${t.id}-resolved`, action: 'Status changed to Resolved.', timestamp: t.updated_at, actor: 'System' });
    }
  }

  const mapRelated = (r: import('../../../types').RelatedTicketRef): RelatedTicketRef => ({
    id:           r.id,
    ticketNumber: r.ticket_number ?? null,
    title:        r.title,
    category:     r.category,
    status:       r.status,
  });

  return {
    id:             t.id,
    ticket_number:  t.ticket_number ?? null,
    title:          t.title,
    description:    t.description,
    category:       API_CATEGORY_TO_FIGMA[t.category] ?? 'VoIP & Dialer Issues',
    priority:       API_PRIORITY_TO_FIGMA[t.priority] ?? 'Low',
    status:         API_STATUS_TO_FIGMA[t.status] ?? 'Open',
    urgency:        (t.urgency ?? 'minor_issue') as Urgency,
    assignee:       t.assigned_to?.display_name ?? t.assigned_to?.username ?? 'Unassigned',
    creator:        t.submitted_by?.display_name ?? t.submitted_by?.username ?? 'Unknown',
    branch:         (t.branch?.name ?? 'Main Branch') as any,
    shift:          API_SHIFT_TO_FIGMA[t.shift] ?? 'Morning',
    agentsAffected: t.agents_affected,
    floor:          t.floor_team,
    isFloorWide:    t.is_floor_wide,
    relatedTo:      t.related_to ? mapRelated(t.related_to) : null,
    followUps:      (t.follow_ups ?? []).map(mapRelated),
    escalationStatus: t.escalated
      ? (escalationLog?.resolved_at || t.escalation_resolved ? 'Resolved by Main Branch' : 'Escalated')
      : 'Not Escalated',
    escalatedAt:    escalationLog?.escalated_at,
    escalationNotes: escalationLog?.reason,
    resolutionNotes: t.resolution_notes ?? '',
    slaStatus:      t.sla_status ?? 'on_track',
    createdAt:      t.created_at,
    updatedAt:      t.updated_at,
    resolvedAt:     t.resolved_at ?? null,
    history,
  };
}

// ── Context type ───────────────────────────────────────────────
interface TicketContextType {
  tickets: Ticket[];
  currentUser: { id: string; name: string; role: any; branch: any; department: string | null };
  markFloorWide: (id: string, floorTeam?: string) => Promise<void>;
  createTicket: (
    title: string,
    description: string,
    category: Category,
    agentsAffected: number,
    shift: Shift,
    floor: string,
    isFloorWide: boolean,
    urgency: Urgency,
    priorityOverride?: Priority,
    linkedIncident?: string,
    relatedTicketNumber?: string
  ) => Promise<boolean>;
  updateTicketStatus: (id: string, status: Status) => void;
  updateTicketPriority: (id: string, priority: Priority) => void;
  updateResolutionNotes: (id: string, notes: string) => Promise<void>;
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
    ? { id: currentAccount.id, name: currentAccount.name, role: currentAccount.role, branch: currentAccount.branch, department: currentAccount.department ?? null }
    : { id: '', name: '', role: 'Agent (end-user)' as any, branch: 'Main Branch' as any, department: null };

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
      if (status === 'resolved' && localStorage.getItem('cfg_emailNotifs') !== 'false') {
        const t = tickets.find(tk => tk.id === id);
        if (t) {
          addNotification({
            type: 'ticket_resolved',
            title: 'Ticket Resolved',
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

  const resolutionMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiUpdateResolutionNotes(id, notes),
    onSuccess: (_, { id }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Resolution notes saved.');
    },
    onError: () => toast.error('Failed to save resolution notes.'),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) =>
      apiUpdateTicketPriority(id, priority),
    onSuccess: (_, { priority }) => {
      invalidate();
      toast.success(`Priority updated to ${priority}`);
    },
    onError: () => toast.error('Failed to update ticket priority.'),
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiEscalateTicket(id, reason),
    onSuccess: (_, { id, reason }) => {
      invalidate();
      toast.warning(`Ticket ${id} escalated to Main Branch`);
      const t = tickets.find(tk => tk.id === id);
      if (t && localStorage.getItem('cfg_emailNotifs') !== 'false') {
        addNotification({
          type: 'escalation',
          title: 'Escalation Triggered',
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
    urgency: Urgency,
    _priorityOverride?: Priority,
    linkedIncident?: string,
    relatedTicketNumber?: string,
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
        urgency,
        major_incident: linkedIncident ?? null,
        ...(relatedTicketNumber ? { related_ticket_number: relatedTicketNumber } : {}),
      });
      await invalidate();
      const mappedTicket = mapApiTicket(created as ApiTicket);
      if (localStorage.getItem('cfg_emailNotifs') !== 'false') {
        addNotification({
          type:     'ticket_assigned',
          title:    'New Ticket',
          message:  `${title} submitted. Priority: ${mappedTicket.priority}. Assigned: ${mappedTicket.assignee}.`,
          branch:   currentUser.branch,
          ticketId: created.id,
          priority: mappedTicket.priority,
        });
      }
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
      return true;
    } catch {
      toast.error('Failed to submit ticket. Please try again.');
      return false;
    }
  };

  const updateTicketStatus = (id: string, status: Status) => {
    statusMutation.mutate({ id, status: FIGMA_STATUS_TO_API[status] });
  };

  const updateTicketPriority = (id: string, priority: Priority) => {
    const apiPriority = priority.toLowerCase();
    priorityMutation.mutate({ id, priority: apiPriority });
  };

  const updateResolutionNotes = async (id: string, notes: string) => {
    await resolutionMutation.mutateAsync({ id, notes });
  };

  const assignTicket = (_id: string, assignee: string) => {
    toast.info(`Assign to "${assignee}" — backend requires a numeric user ID. Use the detail page.`);
  };

  const escalateTicket = (id: string, notes: string) => {
    escalateMutation.mutate({ id, reason: notes });
  };

  const resolveEscalation = (id: string) => {
    resolveEscalationApi(id)
      .then(() => {
        invalidate();
        queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        toast.success('Escalation marked as resolved by Main Branch.');
      })
      .catch(() => toast.error('Failed to resolve escalation.'));
  };

  const markFloorWide = async (id: string, floorTeam?: string) => {
    try {
      await apiMarkFloorWide(id, floorTeam);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Ticket flagged as a floor-wide incident.');
    } catch {
      toast.error('Failed to flag ticket as floor-wide.');
    }
  };

  return (
    <TicketContext.Provider value={{
      tickets,
      currentUser,
      markFloorWide,
      createTicket,
      updateTicketStatus,
      updateTicketPriority,
      updateResolutionNotes,
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
