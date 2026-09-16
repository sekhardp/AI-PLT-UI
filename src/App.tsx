import { DocumentManagerModal } from './components/DocumentManagerModal';
import { TopNav } from './components/TopNav';
import { ToolRegistryModal } from './components/ToolRegistryModal';
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';
import { UserPage } from './pages/User';
import { AdminPage } from './pages/Admin';
import type { Session, Agent } from './types';
import { fetchSessions, fetchAgents, deleteSession as apiDeleteSession } from './api';

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
        <TopNav
          sessions={sessions}
          activeSessionId={activeSessionId}
          onShowAgents={onShowAgents}
          onShowUpload={onShowUpload}
          agents={agents}
          onNewChat={onNewChat}
        />

        <Outlet />
      </div>

      {showAgents && (
        <ToolRegistryModal agents={agents} onClose={() => setShowAgents(false)} />
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
