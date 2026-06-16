/**
 * SLAScanner — invisible background component.
 * Scans all open tickets every 30 seconds and fires a sla_warning
 * notification the first time a ticket reaches ≥75 % of its SLA window.
 * Must be rendered inside both <NotificationProvider> and <TicketProvider>.
 */
import React, { useEffect, useRef } from 'react';
import { useTickets }       from '../context/TicketContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth }          from '../context/AuthContext';
import { SLA_HOURS }        from '../types';

const SCAN_INTERVAL_MS = 30_000; // 30 s

export const SLAScanner: React.FC = () => {
  const { tickets }                         = useTickets();
  const { addNotification, slaFired, markSLAFired } = useNotifications();
  const { currentAccount }                  = useAuth();

  // Keep refs so the interval callback always sees the latest values
  const ticketsRef   = useRef(tickets);
  const slaFiredRef  = useRef(slaFired);
  const addNotifRef  = useRef(addNotification);
  const markFiredRef = useRef(markSLAFired);

  useEffect(() => { ticketsRef.current   = tickets;          }, [tickets]);
  useEffect(() => { slaFiredRef.current  = slaFired;         }, [slaFired]);
  useEffect(() => { addNotifRef.current  = addNotification;  }, [addNotification]);
  useEffect(() => { markFiredRef.current = markSLAFired;     }, [markSLAFired]);

  useEffect(() => {
    const scan = () => {
      // Agents don't act on tickets — only IT staff should receive SLA warnings
      if (currentAccount?.role === 'Agent (end-user)') return;
      // Respect the SLA Breach Alerts toggle stored in localStorage by SystemConfig
      if (localStorage.getItem('cfg_slaAlerts') === 'false') return;

      const now = Date.now();
      ticketsRef.current.forEach(ticket => {
        if (ticket.status === 'Resolved')           return;
        if (slaFiredRef.current.has(ticket.id))     return;

        const slaMs   = SLA_HOURS[ticket.priority] * 3_600_000;
        const elapsed = now - new Date(ticket.createdAt).getTime();
        const pct     = elapsed / slaMs;

        if (pct >= 0.75) {
          const pctLabel  = Math.round(pct * 100);
          const isBreached = pct >= 1;

          addNotifRef.current({
            type:     'sla_warning',
            title:    isBreached ? 'SLA Breach' : 'SLA Warning',
            message:  `${ticket.title} — ${pctLabel}% of the ${SLA_HOURS[ticket.priority]}h ${ticket.priority} SLA has elapsed. ${ticket.agentsAffected} agent(s) affected on ${ticket.shift} shift.`,
            branch:   ticket.branch,
            ticketId: ticket.id,
            priority: ticket.priority,
          });

          markFiredRef.current(ticket.id);
        }
      });
    };

    // Run once immediately (catches freshly-created tickets on page load)
    scan();
    const id = setInterval(scan, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, []); // empty deps — refs keep values fresh

  return null;
};