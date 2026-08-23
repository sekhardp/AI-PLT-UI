import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Cpu, Upload, Network, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Session } from '../types';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onShowAgents: () => void;
  onShowUpload: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onShowAgents,
  onShowUpload,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSessionClick = (sessionId: string) => {
    onSelectSession(sessionId);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleNewChatClick = () => {
    onNewChat();
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sidebar" aria-label="Chat sessions">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <Network size={18} color="#fff" />
          </div>
          <div>
            <div className="brand-name">AI Platform Local LLM</div>
            <div className="brand-sub">Local LLM Orchestration</div>
          </div>
        </div>
        <button className="new-chat-btn" onClick={handleNewChatClick} id="btn-new-chat">
          <Plus size={15} /> New Chat
        </button>
      </div>

      <div className="session-list" role="list">
        {sessions.length === 0 && (
          <div style={{ padding: '12px 10px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            No conversations yet
          </div>
        )}
        {sessions.length > 0 && (
          <div className="session-group-label">Recent</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.session_id}
            className={`session-item ${s.session_id === activeSessionId && location.pathname === '/' ? 'active' : ''}`}
            role="listitem"
            onClick={() => handleSessionClick(s.session_id)}
          >
            <div className="session-item-text">
              <div className="session-item-title">{s.last_message || 'New conversation'}</div>
              <div className="session-item-meta">{s.message_count} messages</div>
            </div>
            <button
              className="session-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s.session_id);
              }}
              aria-label="Delete session"
              id={`btn-delete-session-${s.session_id.slice(0, 8)}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        {/* Navigation routes */}
        <Link
          to="/"
          className={`sidebar-nav-btn ${location.pathname === '/' ? 'active' : ''}`}
          id="btn-nav-chat"
        >
          <Network size={15} /> Chat Workspace
        </Link>

        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={`sidebar-nav-btn ${location.pathname === '/admin' ? 'active' : ''}`}
            id="btn-nav-admin"
          >
            <ShieldAlert size={15} /> Admin Dashboard
          </Link>
        )}

        <Link
          to="/profile"
          className={`sidebar-nav-btn ${location.pathname === '/profile' ? 'active' : ''}`}
          id="btn-nav-profile"
        >
          <UserIcon size={15} /> User Profile
        </Link>

        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />

        <button className="sidebar-nav-btn" onClick={onShowAgents} id="btn-show-agents">
          <Cpu size={15} /> Agent Registry
        </button>
        <button className="sidebar-nav-btn" onClick={onShowUpload} id="btn-show-upload">
          <Upload size={15} /> File Upload
        </button>

        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />

        {user && (
          <div className="sidebar-user-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.role === 'admin' ? 'Administrator' : 'Standard User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              title="Logout"
              id="btn-logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
