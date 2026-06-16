import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .models import Notification

logger = logging.getLogger(__name__)

_PRIORITY_COLORS = {
    'critical': ('#fef2f2', '#dc2626', 'CRITICAL'),
    'high':     ('#fff7ed', '#ea580c', 'HIGH'),
    'medium':   ('#fefce8', '#ca8a04', 'MEDIUM'),
    'low':      ('#eff6ff', '#2563eb', 'LOW'),
}


def _build_critical_alert_html(supervisor_name, ticket, sla, ticket_url):
    description_html = ticket.description.replace('\n', '<br>')
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header — red critical strip -->
        <tr>
          <td style="background:#7f1d1d;padding:6px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#fca5a5;letter-spacing:1.5px;text-transform:uppercase;">&#9888;&#65039; Critical Severity — Immediate Attention Required</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1e293b;padding:28px 32px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">BPO IT Helpdesk · Supervisor Alert</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:600;">Critical Ticket Created</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <p style="margin:0 0 24px;font-size:15px;color:#334155;">
              Hello <strong>{supervisor_name}</strong>,<br><br>
              A <strong style="color:#dc2626;">CRITICAL</strong> priority ticket has been submitted in your branch
              and requires your immediate oversight.
            </p>

            <!-- Ticket number + priority badge -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td>
                  <span style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">{ticket.ticket_number or ticket.pk}</span>
                </td>
                <td align="right">
                  <span style="display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #dc2626;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:20px;">CRITICAL</span>
                </td>
              </tr>
            </table>

            <!-- Title -->
            <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#1e293b;">{ticket.title}</p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#fef2f2;">
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;width:38%;border-bottom:1px solid #e2e8f0;">Category</td>
                <td style="padding:10px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">{ticket.get_category_display()}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Branch</td>
                <td style="padding:10px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">{ticket.branch}</td>
              </tr>
              <tr style="background:#fef2f2;">
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Agents Affected</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#dc2626;border-bottom:1px solid #e2e8f0;">{ticket.agents_affected} agent{"s" if ticket.agents_affected != 1 else ""}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;">SLA Deadline</td>
                <td style="padding:10px 16px;font-size:14px;color:#dc2626;font-weight:600;">{sla} &nbsp;<span style="font-size:11px;color:#94a3b8;">(1-hour SLA)</span></td>
              </tr>
            </table>

            <!-- Description -->
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;">Description</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;font-size:14px;color:#334155;line-height:1.6;margin-bottom:28px;">{description_html}</div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="{ticket_url}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">View Critical Ticket</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated critical alert · Do not reply to this email</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_assignment_html(tech_name, ticket, sla, ticket_url):
    bg, color, label = _PRIORITY_COLORS.get(ticket.priority, ('#f9fafb', '#6b7280', ticket.priority.upper()))
    description_html = ticket.description.replace('\n', '<br>')
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1e293b;padding:28px 32px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">BPO IT Helpdesk</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:600;">New Ticket Assigned</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <p style="margin:0 0 24px;font-size:15px;color:#334155;">
              Hello <strong>{tech_name}</strong>,<br><br>
              A ticket has been assigned to you and requires your attention.
            </p>

            <!-- Ticket number + priority badge -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td>
                  <span style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">{ticket.ticket_number or ticket.pk}</span>
                </td>
                <td align="right">
                  <span style="display:inline-block;background:{bg};color:{color};border:1px solid {color};font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:20px;">{label}</span>
                </td>
              </tr>
            </table>

            <!-- Title -->
            <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#1e293b;">{ticket.title}</p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f8fafc;">
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;width:38%;border-bottom:1px solid #e2e8f0;">Category</td>
                <td style="padding:10px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">{ticket.get_category_display()}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Branch</td>
                <td style="padding:10px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">{ticket.branch}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;">SLA Deadline</td>
                <td style="padding:10px 16px;font-size:14px;color:#dc2626;font-weight:600;">{sla}</td>
              </tr>
            </table>

            <!-- Description -->
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;">Description</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;font-size:14px;color:#334155;line-height:1.6;margin-bottom:28px;">{description_html}</div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="{ticket_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">View Ticket in Helpdesk</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated notification · Do not reply to this email</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


class NotificationService:

    @staticmethod
    def _send_email(to_email: str, subject: str, plain: str, html: str) -> None:
        from apps.tickets.models import SystemSettings
        if not SystemSettings.get().email_notifications:
            return
        if not getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', False):
            return
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            msg.attach_alternative(html, 'text/html')
            msg.send()
        except Exception as exc:
            logger.error('Email notification failed for %s: %s', to_email, exc)

    @staticmethod
    def notify_assignment(ticket):
        if not ticket.assigned_to:
            return
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.assigned_to,
                notification_type=Notification.NotificationType.TICKET_ASSIGNED,
                ticket=ticket,
                message=f'Ticket "{ticket.title}" has been assigned to you.',
            )
        ])
        if ticket.assigned_to.email:
            sla = (
                ticket.sla_deadline.strftime('%b %d %Y, %I:%M %p')
                if ticket.sla_deadline else 'N/A'
            )
            tech_name = ticket.assigned_to.get_full_name().strip() or ticket.assigned_to.username
            plain = (
                f'Hello {tech_name},\n\n'
                f'A new ticket has been assigned to you.\n\n'
                f'Ticket:    {ticket.ticket_number or ticket.pk}\n'
                f'Title:     {ticket.title}\n'
                f'Category:  {ticket.get_category_display()}\n'
                f'Priority:  {ticket.get_priority_display()}\n'
                f'Branch:    {ticket.branch}\n'
                f'SLA Due:   {sla}\n\n'
                f'Description:\n{ticket.description}\n\n'
                f'Log in to the helpdesk to manage this ticket.\n\n'
                f'— BPO IT Helpdesk (automated notification)'
            )
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            ticket_url = f'{frontend_url}/tickets/{ticket.pk}'
            html = _build_assignment_html(tech_name, ticket, sla, ticket_url)
            NotificationService._send_email(
                to_email=ticket.assigned_to.email,
                subject=f'[Ticket Assigned] {ticket.ticket_number or ticket.pk} — {ticket.title}',
                plain=plain,
                html=html,
            )

    @staticmethod
    def notify_critical_ticket(ticket):
        """Email branch supervisors and main IT supervisor when a critical-priority ticket is created."""
        from apps.accounts.models import UserProfile
        from django.db.models import Q
        supervisors = UserProfile.objects.filter(
            Q(branch=ticket.branch, role='branch_supervisor') |
            Q(role='main_it_supervisor'),
            is_active=True,
        ).exclude(email='')

        if not supervisors.exists():
            return

        Notification.objects.bulk_create([
            Notification(
                recipient=sup,
                notification_type=Notification.NotificationType.TICKET_ASSIGNED,
                ticket=ticket,
                message=(
                    f'CRITICAL ticket "{ticket.title}" submitted in your branch '
                    f'— {ticket.agents_affected} agent(s) affected. SLA: 1 hour.'
                ),
            )
            for sup in supervisors
        ])

        if not getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', False):
            return

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        ticket_url = f'{frontend_url}/tickets/{ticket.pk}'
        sla = (
            ticket.sla_deadline.strftime('%b %d %Y, %I:%M %p')
            if ticket.sla_deadline else 'N/A'
        )

        for sup in supervisors:
            if not sup.email:
                continue
            sup_name = sup.get_full_name().strip() or sup.username
            plain = (
                f'Hello {sup_name},\n\n'
                f'A CRITICAL priority ticket has been submitted in your branch.\n\n'
                f'Ticket:          {ticket.ticket_number or ticket.pk}\n'
                f'Title:           {ticket.title}\n'
                f'Category:        {ticket.get_category_display()}\n'
                f'Agents Affected: {ticket.agents_affected}\n'
                f'Branch:          {ticket.branch}\n'
                f'SLA Deadline:    {sla}\n\n'
                f'Description:\n{ticket.description}\n\n'
                f'Log in to the helpdesk immediately to monitor this ticket.\n\n'
                f'— BPO IT Helpdesk (automated critical alert)'
            )
            html = _build_critical_alert_html(sup_name, ticket, sla, ticket_url)
            NotificationService._send_email(
                to_email=sup.email,
                subject=f'[CRITICAL ALERT] {ticket.ticket_number or ticket.pk} — {ticket.title}',
                plain=plain,
                html=html,
            )

    @staticmethod
    def notify_sla_warning(ticket):
        from apps.accounts.models import UserProfile
        recipients = {}
        if ticket.assigned_to:
            recipients[ticket.assigned_to.pk] = ticket.assigned_to
        for user in UserProfile.objects.filter(branch=ticket.branch, role='branch_supervisor'):
            recipients[user.pk] = user

        Notification.objects.bulk_create([
            Notification(
                recipient=user,
                notification_type=Notification.NotificationType.SLA_WARNING,
                ticket=ticket,
                message=f'SLA warning: ticket "{ticket.title}" deadline is approaching.',
            )
            for user in recipients.values()
        ])

    @staticmethod
    def notify_sla_breach(ticket):
        from apps.accounts.models import UserProfile
        recipients = {}
        if ticket.assigned_to:
            recipients[ticket.assigned_to.pk] = ticket.assigned_to
        for user in UserProfile.objects.filter(branch=ticket.branch, role='branch_supervisor'):
            recipients[user.pk] = user
        for user in UserProfile.objects.filter(role='main_it_manager'):
            recipients[user.pk] = user

        Notification.objects.bulk_create([
            Notification(
                recipient=user,
                notification_type=Notification.NotificationType.SLA_WARNING,
                ticket=ticket,
                message=f'SLA breached: ticket "{ticket.title}" has exceeded its deadline.',
            )
            for user in recipients.values()
        ])

    @staticmethod
    def notify_escalation(ticket, escalated_by):
        from apps.accounts.models import UserProfile
        supervisors = UserProfile.objects.filter(role='main_it_supervisor')
        Notification.objects.bulk_create([
            Notification(
                recipient=sup,
                notification_type=Notification.NotificationType.ESCALATION_TRIGGERED,
                ticket=ticket,
                message=f'Ticket "{ticket.title}" has been escalated by {escalated_by.username}.',
            )
            for sup in supervisors
        ])

    @staticmethod
    def notify_resolved(ticket):
        if not ticket.submitted_by:
            return
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.submitted_by,
                notification_type=Notification.NotificationType.TICKET_RESOLVED,
                ticket=ticket,
                message=f'Your ticket "{ticket.title}" has been resolved.',
            )
        ])

    @staticmethod
    def notify_status_update(ticket, new_status):
        """Notify the ticket submitter when status changes (excluding resolved, which has its own method)."""
        if not ticket.submitted_by:
            return
        status_labels = {
            'in_progress': 'is now being worked on',
            'pending': 'is pending — awaiting further information or escalation review',
            'open': 'has been reopened',
        }
        label = status_labels.get(new_status, f'status has been updated to {new_status}')
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.submitted_by,
                notification_type=Notification.NotificationType.TICKET_UPDATED,
                ticket=ticket,
                message=f'Your ticket "{ticket.title}" {label}.',
            )
        ])

    @staticmethod
    def notify_floor_wide(ticket, flagged_by):
        """Notify the assigned technician and branch supervisor when a ticket is flagged floor-wide."""
        from apps.accounts.models import UserProfile
        recipients = {}
        if ticket.assigned_to:
            recipients[ticket.assigned_to.pk] = ticket.assigned_to
        for user in UserProfile.objects.filter(branch=ticket.branch, role='branch_supervisor'):
            recipients[user.pk] = user
        recipients.pop(flagged_by.pk, None)

        Notification.objects.bulk_create([
            Notification(
                recipient=user,
                notification_type=Notification.NotificationType.TICKET_UPDATED,
                ticket=ticket,
                message=(
                    f'Ticket "{ticket.title}" has been flagged as a floor-wide incident '
                    f'by {flagged_by.username}.'
                ),
            )
            for user in recipients.values()
        ])

    @staticmethod
    def notify_submitter_escalation(ticket):
        """Notify the ticket submitter that their ticket has been escalated."""
        if not ticket.submitted_by:
            return
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.submitted_by,
                notification_type=Notification.NotificationType.ESCALATION_TRIGGERED,
                ticket=ticket,
                message=(
                    f'Your ticket "{ticket.title}" has been escalated to the Main Branch IT team '
                    f'for further assistance.'
                ),
            )
        ])
