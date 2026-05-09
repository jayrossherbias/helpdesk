import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { BookOpen, Search, ChevronRight, Wifi, Monitor, KeyRound, Headphones, Cpu, PhoneCall } from 'lucide-react';

const articles = [
  {
    id: 1,
    title: 'Softphone Not Connecting — Quick Fix Guide',
    category: 'VoIP & Dialer Issues',
    icon: PhoneCall,
    content: 'Step 1: Check your internet connection (run speed test — minimum 10 Mbps required per seat). Step 2: Restart the Zoiper/Five9 application. Step 3: Ensure your headset is properly connected via USB and detected by Windows. Step 4: Re-enter your SIP credentials from the dialer portal. If the issue persists across multiple agents, escalate as a floor-wide incident immediately — agent downtime means direct call volume loss.',
  },
  {
    id: 2,
    title: 'CRM Login Failures — Salesforce / Zendesk',
    category: 'CRM & Call Center Software',
    icon: Cpu,
    content: 'Common causes: (1) Cached session expired — clear browser cookies and try again. (2) Password expired — request reset from the Account Team. (3) System-wide CRM outage — check the IT status board before filing individual tickets. (4) Multi-factor authentication issues — ensure your registered phone number is accessible. Submit a ticket under "CRM & Call Center Software" if the issue affects more than 2 agents.',
  },
  {
    id: 3,
    title: 'How to Reset Your Call Center Account Password',
    category: 'Account & Access Management',
    icon: KeyRound,
    content: 'For locked accounts: Contact your floor supervisor first to confirm the lockout. Then submit a ticket under "Account & Access Management" with your employee ID, seat number, and current shift. The Account Team targets a 30-minute resolution for locked accounts during the Morning and Afternoon shifts. Night shift accounts are resolved within 1 hour.',
  },
  {
    id: 4,
    title: 'VPN Setup for Remote or Work-From-Home Agents',
    category: 'Network & Connectivity',
    icon: Wifi,
    content: 'Download the approved VPN client from the IT portal. Use your corporate email and password to authenticate. Select the server nearest to your region (PH-CEBU, PH-DAVAO, PH-MANILA). Minimum internet speed: 10 Mbps upload for stable call quality. If VPN drops during a shift, reconnect and notify your supervisor. Repeated drops should be reported as a "Network & Connectivity" ticket.',
  },
  {
    id: 5,
    title: 'Headset Troubleshooting for Call Center Agents',
    category: 'Workstation & Peripherals',
    icon: Headphones,
    content: 'If your headset is not detected: (1) Unplug and re-plug into a different USB port. (2) Check Device Manager for driver errors. (3) Try the headset on another PC to confirm it is not defective. (4) Restart the softphone application after reconnecting. Use a borrowed headset as a workaround to avoid call loss. Submit a "Workstation & Peripherals" ticket with your seat number if the issue persists.',
  },
  {
    id: 6,
    title: 'Internet Outage — What To Do Immediately',
    category: 'Network & Connectivity',
    icon: Wifi,
    content: 'If your floor loses internet: (1) Immediately notify your floor supervisor — do NOT wait. (2) One representative should submit a floor-wide ticket under "Network & Connectivity" on behalf of the affected floor. Mark "Is this a Floor-Wide Incident?" as Yes. (3) Include: floor/building name, estimated agents affected, shift time. The Network Team will prioritize based on agent count and revenue impact. Do NOT submit individual tickets for the same outage.',
  },
  {
    id: 7,
    title: 'Understanding Shift Schedules & IT Support Hours',
    category: 'Account & Access Management',
    icon: Monitor,
    content: 'IT Support operates 24/7 across three shifts:\n• Morning: 6:00 AM – 2:00 PM\n• Afternoon: 2:00 PM – 10:00 PM\n• Night: 10:00 PM – 6:00 AM\n\nCritical tickets (20+ agents affected) are responded to within 1 hour regardless of shift. High priority tickets (5-19 agents): 4 hours. Medium (2-4 agents): 8 hours. Low (single agent): 24 hours. If you submit a ticket and it is not assigned within 30 minutes for a Critical issue, escalate directly to your IT supervisor.',
  },
  {
    id: 8,
    title: 'New Workstation Setup for Call Center Agents',
    category: 'Workstation & Peripherals',
    icon: Monitor,
    content: 'When setting up a new agent workstation: (1) Connect monitor, keyboard, mouse, and headset before powering on. (2) Log in with your domain account (format: emp.lastname@bpo.com). (3) Wait for Group Policy to apply — this may take 5–10 minutes on first login. (4) Launch the softphone application and log in with your dialer credentials. (5) Test a call before the shift starts. Report any setup issues to the Workstation Team with your seat number and employee ID.',
  },
];

export const KnowledgeBase = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const categories = ['All', 'VoIP & Dialer Issues', 'CRM & Call Center Software', 'Account & Access Management', 'Network & Connectivity', 'Workstation & Peripherals'];

  const filtered = articles.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className={`text-2xl flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <BookOpen size={26} className="text-blue-500" /> Knowledge Base
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          BPO IT self-service guides. Check here before submitting a ticket — agent downtime is costly.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-slate-900 placeholder-gray-400'}`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className={`px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-slate-900'}`}
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(article => (
          <div
            key={article.id}
            className={`rounded-xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
          >
            <button
              onClick={() => setExpanded(expanded === article.id ? null : article.id)}
              className="w-full flex items-center gap-4 p-5 text-left"
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <article.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{article.title}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{article.category}</p>
              </div>
              <ChevronRight size={16} className={`shrink-0 transition-transform ${expanded === article.id ? 'rotate-90' : ''} ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            </button>
            {expanded === article.id && (
              <div className={`px-5 pb-5 border-t ${isDark ? 'text-slate-300 border-slate-800' : 'text-gray-600 border-gray-200'}`}>
                <p className="pt-4 text-sm whitespace-pre-wrap leading-relaxed">{article.content}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No articles found.</p>
        )}
      </div>
    </div>
  );
};