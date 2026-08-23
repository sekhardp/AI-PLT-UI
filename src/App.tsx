import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Cpu, Database, GitBranch, X, CheckCircle, Upload as UploadIcon, Bot } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';
import { UserPage } from './pages/User';
import { AdminPage } from './pages/Admin';
import type { Session, Agent, UploadedFile } from './types';
import { fetchSessions, fetchAgents, uploadFile, deleteSession as apiDeleteSession } from './api';

// ─── Agent Chips ─────────────────────────────────────────────────────────────
function AgentChips() {
  return (
    <div className="topbar-chips" aria-label="Active agents">
      {['Orchestrator', 'AI Agent', 'RAG Agent'].map((name) => (
        <div key={name} className="agent-chip">
          <span className="dot" aria-hidden="true" /> {name}
        </div>
      ))}
    </div>
  );
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────
interface UploadPanelProps {
  onClose: () => void;
  pendingFiles: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  onUploadAll: () => void;
  onRemoveFile: (id: string) => void;
}

function UploadPanel({ onClose, pendingFiles, onFilesSelected, onUploadAll, onRemoveFile }: UploadPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onFilesSelected(Array.from(e.dataTransfer.files));
  };

  const formatBytes = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="panel-overlay" role="dialog" aria-modal="true" aria-label="File upload">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Upload Files</h2>
          <button className="panel-close-btn" onClick={onClose} aria-label="Close upload panel" id="btn-close-upload">
            <X size={18} />
          </button>
        </div>

        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to browse"
          id="drop-zone"
        >
          <div className="drop-zone-icon"><UploadIcon size={32} /></div>
          <h3>Drop files here</h3>
          <p>or click to browse — up to 50 MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="file-input-hidden"
          onChange={(e) => e.target.files && onFilesSelected(Array.from(e.target.files))}
          aria-hidden="true"
        />

        {pendingFiles.length > 0 && (
          <div className="upload-file-list">
            {pendingFiles.map((f) => (
              <div key={f.id} className="upload-file-item">
                <div className="upload-file-info">
                  <div className="upload-file-name">{f.file.name}</div>
                  <div className="upload-file-size">{formatBytes(f.file.size)}</div>
                </div>
                {f.done ? (
                  <CheckCircle size={18} className="upload-done" color="var(--success)" />
                ) : (
                  <div className="upload-progress">
                    <div className="upload-progress-bar" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
                <button
                  className="panel-close-btn"
                  onClick={() => onRemoveFile(f.id)}
                  aria-label={`Remove ${f.file.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              className="upload-submit-btn"
              onClick={onUploadAll}
              disabled={pendingFiles.every((f) => f.done)}
              id="btn-upload-all"
            >
              Upload {pendingFiles.filter((f) => !f.done).length} file(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  pendingFiles: UploadedFile[];
  handleFilesSelected: (files: File[]) => void;
  handleUploadAll: () => void;
  setPendingFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
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
  pendingFiles,
  handleFilesSelected,
  handleUploadAll,
  setPendingFiles,
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
            <AgentChips />
          </div>
        </header>

        <Outlet />
      </div>

      {showAgents && (
        <AgentsPanel agents={agents} onClose={() => setShowAgents(false)} />
      )}

      {showUpload && (
        <UploadPanel
          onClose={() => setShowUpload(false)}
          pendingFiles={pendingFiles}
          onFilesSelected={handleFilesSelected}
          onUploadAll={handleUploadAll}
          onRemoveFile={(id) => setPendingFiles((prev) => prev.filter((f) => f.id !== id))}
        />
      )}
    </div>
  );
}

// ─── Main Application Shell ──────────────────────────────────────────────────
export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgents, setShowAgents] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);

  // Load initial data
  useEffect(() => {
    fetchSessions().then(setSessions).catch(console.warn);
    fetchAgents().then(setAgents).catch(console.warn);
  }, []);

  const refreshSessions = useCallback(async () => {
    const s = await fetchSessions().catch(() => []);
    setSessions(s);
  }, []);

  const startNewChat = useCallback(() => {
    setActiveSessionId('');
  }, []);

  const selectSession = useCallback((sid: string) => {
    setActiveSessionId(sid);
  }, []);

  const deleteSession = useCallback(async (sid: string) => {
    await apiDeleteSession(sid).catch(console.warn);
    if (sid === activeSessionId) startNewChat();
    await refreshSessions();
  }, [activeSessionId, refreshSessions, startNewChat]);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map((f) => ({
      file: f, id: uuidv4(), progress: 0, done: false,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleUploadAll = useCallback(async () => {
    const toUpload = pendingFiles.filter((f) => !f.done);
    await Promise.all(
      toUpload.map(async (f) => {
        try {
          const fileId = await uploadFile(f.file, (pct) => {
            setPendingFiles((prev) =>
              prev.map((p) => p.id === f.id ? { ...p, progress: pct } : p)
            );
          });
          setPendingFiles((prev) =>
            prev.map((p) => p.id === f.id ? { ...p, done: true, serverFileId: fileId } : p)
          );
        } catch (err) {
          console.error(err);
        }
      })
    );
  }, [pendingFiles]);

  return (
    <AuthProvider>
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
                  pendingFiles={pendingFiles}
                  handleFilesSelected={handleFilesSelected}
                  handleUploadAll={handleUploadAll}
                  setPendingFiles={setPendingFiles}
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
                    pendingFiles={pendingFiles}
                    setPendingFiles={setPendingFiles}
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
    </AuthProvider>
  );
}
