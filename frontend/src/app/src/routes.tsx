import { createBrowserRouter, redirect } from "react-router";
import { Layout }           from "./components/Layout";
import { SLAScanner }       from "./components/SLAScanner";
import { Dashboard }        from "./pages/Dashboard";
import { Tickets }          from "./pages/Tickets";
import { CreateTicket }     from "./pages/CreateTicket";
import { TicketDetail }     from "./pages/TicketDetail";
import { KnowledgeBase }    from "./pages/KnowledgeBase";
import { TeamManagement }   from "./pages/TeamManagement";
import { SystemConfig }     from "./pages/SystemConfig";
import { UserManagement }   from "./pages/UserManagement";
import { Notifications }    from "./pages/Notifications";
import { AccountSettings }  from "./pages/AccountSettings";
import { ThemeProvider }    from "./context/ThemeContext";
import { TicketProvider }   from "./context/TicketContext";
import { AuthProvider }     from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AuthGate }         from "./components/AuthGate";

/**
 * Provider order matters:
 *   NotificationProvider  ← must wrap TicketProvider so TicketContext
 *   TicketProvider           can call useNotifications()
 *     SLAScanner           ← needs both contexts; renders null
 *     Layout
 */
const Root = () => (
  <ThemeProvider>
    <AuthProvider>
      <AuthGate>
        <NotificationProvider>
          <TicketProvider>
            <SLAScanner />
            <Layout />
          </TicketProvider>
        </NotificationProvider>
      </AuthGate>
    </AuthProvider>
  </ThemeProvider>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true,              Component: Dashboard },
      { path: "tickets",          Component: Tickets },
      { path: "create",           Component: CreateTicket },
      { path: "tickets/:id",      Component: TicketDetail },
      { path: "notifications",    Component: Notifications },
      { path: "knowledge-base",   Component: KnowledgeBase },
      { path: "team",             Component: TeamManagement },
      { path: "admin",            Component: SystemConfig },
      { path: "users",            Component: UserManagement },
      { path: "settings",         Component: AccountSettings },
    ],
  },
  // /login is not a real route — AuthGate handles auth on "/"
  { path: "/login", loader: () => redirect("/") },
]);
