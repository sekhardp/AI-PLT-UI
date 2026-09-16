import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Network,
  Wrench,
  ShieldCheck,
  MessageSquare,
  Zap,
  User as UserIcon,
  ChevronRight,
  FileText,
  Bot,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Session, Agent } from '../types';

interface TopNavProps {
  sessions: Session[];
  activeSessionId: string;
  onShowAgents: () => void;
  onShowUpload: () => void;
  agents: Agent[];
  onNewChat: () => void;
}

export function TopNav({
  sessions,
  activeSessionId,
  onShowAgents,
  onShowUpload,
  agents,
  onNewChat: _onNewChat,
}: TopNavProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Find active session title if on chat page
  const activeSession = sessions.find((s) => s.session_id === activeSessionId);
  const sessionTitle = activeSession?.last_message
    ? activeSession.last_message.slice(0, 40) + (activeSession.last_message.length > 40 ? '…' : '')
    : 'Executive Workspace';

  // Determine page title / context
  let currentContextName = 'Executive Workspace';
  let contextIcon = <Bot size={14} className="topnav-context-icon" />;

  if (location.pathname === '/admin') {
    currentContextName = 'Admin Console';
    contextIcon = <ShieldCheck size={14} className="topnav-context-icon admin" />;
  } else if (location.pathname === '/profile') {
    currentContextName = 'User Profile & Quota';
    contextIcon = <UserIcon size={14} className="topnav-context-icon" />;
  } else if (activeSessionId && activeSession) {
    currentContextName = sessionTitle;
    contextIcon = <MessageSquare size={14} className="topnav-context-icon" />;
  }

  const userInitial = (user?.username || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="topnav-header" role="banner">
      {/* ─── Left: Brand Identity & Breadcrumb Context ─────────────────── */}
      <div className="topnav-left">
        <div className="topnav-brand-badge" aria-hidden="true">
          <Network size={16} color="#ffffff" />
        </div>

        <nav className="topnav-breadcrumb" aria-label="Breadcrumb">
          <Link to="/" className="topnav-breadcrumb-root" title="AI Platform Workspace">
            AI Platform
          </Link>
          <ChevronRight size={13} className="topnav-breadcrumb-separator" aria-hidden="true" />
          <div className="topnav-breadcrumb-current" title={currentContextName}>
            {contextIcon}
            <span className="topnav-context-text">{currentContextName}</span>
          </div>
        </nav>

        {/* Live Engine Status Indicator */}
        <div className="topnav-engine-status" title="Connected to Local GPU & BigQuery Telemetry Engine">
          <span className="topnav-status-dot" />
          <span className="topnav-status-label">Engine Online</span>
        </div>
      </div>

      {/* ─── Center: Quick System Tools (Knowledge Base & Tools) ───────── */}
      <div className="topnav-center">
        <button
          type="button"
          className="topnav-tool-btn"
          onClick={onShowUpload}
          title="Open Knowledge Base & Document Manager"
          id="btn-topnav-docs"
        >
          <FileText size={13} />
          <span className="topnav-tool-label">Knowledge Base</span>
        </button>

        <button
          type="button"
          className="topnav-tool-btn"
          onClick={onShowAgents}
          title="Inspect Connected MCP Tools & Data Connectors"
          id="btn-topnav-tools"
        >
          <Wrench size={13} />
          <span className="topnav-tool-label">Tools</span>
          <span className="topnav-tool-badge">{agents.length > 0 ? agents.length : 3}</span>
        </button>
      </div>

      {/* ─── Right: Navigation, Credit Tier & User Profile ──────────────── */}
      <div className="topnav-right">
        {/* Quick Route Switchers */}
        {location.pathname !== '/' && (
          <Link
            to="/"
            className="topnav-nav-link"
            title="Return to Chat Workspace"
            id="btn-topnav-to-chat"
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </Link>
        )}

        {user?.role === 'admin' && location.pathname !== '/admin' && (
          <Link
            to="/admin"
            className="topnav-nav-link admin"
            title="Go to Admin Dashboard"
            id="btn-topnav-to-admin"
          >
            <ShieldCheck size={13} />
            <span>Admin Console</span>
          </Link>
        )}

        {/* User Credit & Role Tier Badge */}
        {user && (
          <div
            className={`topnav-credit-chip ${user.role === 'admin' ? 'admin-tier' : 'user-tier'}`}
            title={
              user.role === 'admin'
                ? 'Unlimited Admin Model & Query Access'
                : `${user.credits} remaining query credits`
            }
          >
            <Zap size={13} className="topnav-credit-icon" />
            <span className="topnav-credit-text">
              {user.role === 'admin' ? 'Admin (Unlimited)' : `${user.credits} Credits`}
            </span>
          </div>
        )}

        {/* User Avatar & Profile Link */}
        {user && (
          <button
            type="button"
            className={`topnav-user-avatar ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
            title={`Logged in as ${user.username || user.email} (${user.role}) - Click for User Profile`}
            aria-label="User Profile"
            id="btn-topnav-profile"
          >
            <span className="avatar-initial">{userInitial}</span>
            {user.role === 'admin' && <span className="avatar-admin-badge" title="Administrator" />}
          </button>
        )}
      </div>
    </header>
  );
}
