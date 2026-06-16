import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Ticket as TicketIcon, PlusCircle, Users, Sun, Moon, Settings, Shield, BarChart3, BookOpen, User, UserCog, UserCheck, LogOut, Building2, Bell, UserCircle } from 'lucide-react';
import { Toaster } from 'sonner@2.0.3';
import { Role, BRANCH_CONFIG, getActiveShift } from '../types';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '../context/NotificationContext';

const roleIcons: Record<Role, React.ComponentType<{ size?: number; className?: string }>> = {
  'Agent (end-user)':           User,
  'Branch IT Technician':       UserCog,
  'Branch IT Supervisor':       UserCheck,
  'Main Branch IT Supervisor':  Shield,
  'Main Branch IT Manager':     Settings,
};

const shiftColors: Record<string, string> = {
  Morning:   'text-amber-400 bg-amber-500/10',
  Afternoon: 'text-sky-400 bg-sky-500/10',
  Night:     'text-indigo-400 bg-indigo-500/10',
};

export const Layout = () => {
  const { currentUser } = useTickets();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const isDark = theme === 'dark';
  const role = currentUser.role;
  const branch = currentUser.branch;
  const branchCfg = BRANCH_CONFIG[branch] ?? { dotClass: 'bg-slate-500', color: '#64748b', label: branch };
  const activeShift = getActiveShift();

  const isStaff = role !== 'Agent (end-user)';
  const isSysAdmin = role === 'Main Branch IT Manager';
  const isMainSupervisor = role === 'Main Branch IT Supervisor';
  // Workflow managers: branch supervisors + main IT supervisor (not system admin)
  const isManagerOrAdmin = role === 'Branch IT Supervisor' || isMainSupervisor;
  // Global badge: both main supervisor and system admin operate across all branches
  const isMainBranchLevel = isMainSupervisor || isSysAdmin;

  // Unread count scoped to this user's branch (or global)
  const isGlobal = isMainBranchLevel;
  const unreadCount = notifications.filter(n =>
    (!n.read) && (isGlobal || n.branch === branch)
  ).length;

  return (
    <div className={`flex h-screen font-sans transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-gray-50 text-slate-800'}`}>
      <Toaster position="top-right" richColors theme={theme} />

      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-slate-900 text-white border-r border-slate-800">

        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <img src="/gs-logo.svg" alt="Global Strategic" className="h-8 w-auto object-contain brightness-0 invert" />
          </div>
          {/* Branch Label with Colored Dot */}
          <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/60">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${branchCfg.dotClass}`} />
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 size={12} className="text-slate-500 shrink-0" />
              <span className="text-xs text-slate-300 truncate">{branchCfg.label}</span>
            </div>
            {(isMainBranchLevel || isSysAdmin) && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0">Global</span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-0.5">
          {/* Dashboard - visible to staff roles */}
          {isStaff && (
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <LayoutDashboard size={18} />
              <span>{isMainBranchLevel ? 'Global Dashboard' : 'Dashboard'}</span>
            </NavLink>
          )}

          {/* Tickets */}
          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <TicketIcon size={18} />
            <span>{role === 'Agent (end-user)' ? 'My Tickets' : 'All Tickets'}</span>
          </NavLink>

          {/* Submit Ticket - all roles */}
          <NavLink
            to="/create"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <PlusCircle size={18} />
            <span>Submit Ticket</span>
          </NavLink>

          {/* Notifications — all roles */}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <div className="relative">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                {unreadCount}
              </span>
            )}
          </NavLink>

          {/* Knowledge Base */}
          <NavLink
            to="/knowledge-base"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <BookOpen size={18} />
            <span>Knowledge Base</span>
          </NavLink>

          {/* Account Settings - all roles */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <UserCircle size={18} />
            <span>Account Settings</span>
          </NavLink>

          {/* Team Management - IT Manager & Admin */}
          {isManagerOrAdmin && (
            <NavLink
              to="/team"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <BarChart3 size={18} />
              <span>Team & SLA</span>
            </NavLink>
          )}

          {/* System Settings - System Admin */}
          {isSysAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Settings size={18} />
              <span>System Config</span>
            </NavLink>
          )}

          {/* User Management - System Admin */}
          {isSysAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Users size={18} />
              <span>User Management</span>
            </NavLink>
          )}
        </nav>

        {/* User Info — click to open Account Settings */}
        <div className="p-4 border-t border-slate-800">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? 'bg-blue-600/20' : 'bg-slate-950/50 hover:bg-slate-800'}`
            }
          >
            {React.createElement(roleIcons[role], { size: 18, className: 'text-blue-400 shrink-0' })}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{role}</p>
            </div>
            <UserCircle size={14} className="text-slate-600 shrink-0" />
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className={`h-14 flex items-center justify-between px-8 shrink-0 border-b transition-colors duration-200 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Shield size={16} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Logged in as <span className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{role}</span>
            </span>
            {/* Active Shift Badge */}
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${shiftColors[activeShift]}`}>
              {activeShift} Shift
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell isDark={isDark} />
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={logout}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-scroll p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};