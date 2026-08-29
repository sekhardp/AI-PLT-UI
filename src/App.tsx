import { DocumentManagerModal } from './components/DocumentManagerModal';
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Cpu, Database, GitBranch, X, Bot } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';
import { UserPage } from './pages/User';
import { AdminPage } from './pages/Admin';
import type { Session, Agent } from './types';
import { fetchSessions, fetchAgents, deleteSession as apiDeleteSession } from './api';

// ─── Agents Panel ─────────────────────────────────────────────────────────────
interface AgentsPanelProps { agents: Agent[]; onClose: () => void; }

const AGENT_ICON_MAP: Record<string, React.ReactNode> = {
  orchestrator: <GitBranch size={18} color="#fff" />,
  'ai-agent':   <Cpu size={18} color="#fff" />,
  'rag-agent':  <Database size={18} color="#fff" />,
};

function AgentsPanel({ agents, onClose }: AgentsPanelProps) {
  return (
    <div className="panel-overlay" role="dialog" aria-modal="true" aria-label="Agent registry">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Agent Registry</h2>
          <button className="panel-close-btn" onClick={onClose} aria-label="Close agents panel" id="btn-close-agents">
            <X size={18} />
          </button>
        </div>
        <div className="agent-list">
          {agents.map((a) => (
            <div key={a.agent_id} className="agent-card" role="article" aria-label={a.name}>
              <div className={`agent-icon ${a.type}`} aria-hidden="true">
                {AGENT_ICON_MAP[a.type] ?? <Bot size={18} color="#fff" />}
              </div>
              <div className="agent-info">
                <div className="agent-name">{a.name}</div>
                <div className="agent-desc">{a.description}</div>
                <div className="agent-caps">
                  {a.capabilities.map((c) => (
                    <span key={c} className="cap-tag">{c}</span>
                  ))}
                </div>
              </div>
              <div className="agent-status">
                <span className="dot" aria-hidden="true" style={{ background: 'var(--success)', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                {a.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Router Guards ────────────────────────────────────────────────────────────
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}

// ─── Main Layout Shell ────────────────────────────────────────────────────────
interface MainLayoutProps {
  sessions: Session[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onShowAgents: () => void;
  onShowUpload: () => void;
  showAgents: boolean;
  showUpload: boolean;
  setShowAgents: (val: boolean) => void;
  setShowUpload: (val: boolean) => void;
  agents: Agent[];
}

function MainLayout({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onShowAgents,
  onShowUpload,
  showAgents,
  showUpload,
  setShowAgents,
  setShowUpload,
  agents,
}: MainLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();

  let topbarTitle = 'AI Platform Chat';
  if (location.pathname === '/') {
    topbarTitle = activeSessionId ? 'Conversation' : 'AI Platform Chat';
  } else if (location.pathname === '/profile') {
    topbarTitle = 'User Profile';
  } else if (location.pathname === '/admin') {
    topbarTitle = 'Admin Console';
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={onNewChat}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
        onShowAgents={onShowAgents}
        onShowUpload={onShowUpload}
      />

      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">{topbarTitle}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user && (
              <div 
                className="credit-chip" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(19, 62, 66, 0.06)',
                  border: '1px solid rgba(19, 62, 66, 0.12)',
                  borderRadius: 'var(--r-full)',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-primary-dark)',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title={user.role === 'admin' ? 'Unlimited Admin Credits' : `${user.credits} remaining credits`}
              >
                <span style={{ color: 'var(--warning)', marginRight: '2px' }}>⚡</span>
                {user.role === 'admin' ? 'Admin (Unlimited)' : `${user.credits} Credits`}
              </div>
            )}
          </div>
        </header>

        <Outlet />
      </div>

      {showAgents && (
        <AgentsPanel agents={agents} onClose={() => setShowAgents(false)} />
      )}

      <DocumentManagerModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
      />
    </div>
  );
}

// ─── Main Application Shell ──────────────────────────────────────────────────
function AppContent() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgents, setShowAgents] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Load initial data scoped to active user
  useEffect(() => {
    fetchSessions(user?.id ? String(user.id) : user?.email).then(setSessions).catch(console.warn);
    fetchAgents().then(setAgents).catch(console.warn);
  }, [user?.email, user?.id]);

  const refreshSessions = useCallback(async () => {
    const s = await fetchSessions(user?.id ? String(user.id) : user?.email).catch(() => []);
    setSessions(s);
  }, [user?.email, user?.id]);

  const startNewChat = useCallback(() => {
    setActiveSessionId('');
  }, []);

  const selectSession = useCallback((sid: string) => {
    setActiveSessionId(sid);
  }, []);

  const deleteSession = useCallback(async (sid: string) => {
    await apiDeleteSession(sid, user?.id ? String(user.id) : user?.email).catch(console.warn);
    if (sid === activeSessionId) startNewChat();
    await refreshSessions();
  }, [activeSessionId, refreshSessions, startNewChat, user?.email]);



  return (
    <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <MainLayout
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onNewChat={startNewChat}
                  onSelectSession={selectSession}
                  onDeleteSession={deleteSession}
                  onShowAgents={() => setShowAgents(true)}
                  onShowUpload={() => setShowUpload(true)}
                  showAgents={showAgents}
                  showUpload={showUpload}
                  setShowAgents={setShowAgents}
                  setShowUpload={setShowUpload}
                  agents={agents}
                />
              }
            >
              <Route
                path="/"
                element={
                  <Chat
                    activeSessionId={activeSessionId}
                    onSessionCreated={setActiveSessionId}
                    refreshSessions={refreshSessions}
                    onShowUpload={() => setShowUpload(true)}
                  />
                }
              />
              <Route path="/profile" element={<UserPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
