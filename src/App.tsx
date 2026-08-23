import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Bot, Send, Paperclip, Plus, Trash2, Cpu, Database, GitBranch,
  Network, X, CheckCircle, ThumbsUp, ThumbsDown, Upload
} from 'lucide-react';
import type { Message, Session, Agent, UploadedFile } from './types';
import {
  streamChat, sendFeedback, fetchSessions, fetchSession,
  deleteSession as apiDeleteSession, fetchAgents, uploadFile
} from './api';

// ─── Sidebar ────────────────────────────────────────────────────────────────

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onShowAgents: () => void;
  onShowUpload: () => void;
}

function Sidebar({
  sessions, activeSessionId, onNewChat, onSelectSession,
  onDeleteSession, onShowAgents, onShowUpload
}: SidebarProps) {
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
        <button className="new-chat-btn" onClick={onNewChat} id="btn-new-chat">
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
            className={`session-item ${s.session_id === activeSessionId ? 'active' : ''}`}
            role="listitem"
            onClick={() => onSelectSession(s.session_id)}
          >
            <div className="session-item-text">
              <div className="session-item-title">{s.last_message || 'New conversation'}</div>
              <div className="session-item-meta">{s.message_count} messages</div>
            </div>
            <button
              className="session-delete-btn"
              onClick={(e) => { e.stopPropagation(); onDeleteSession(s.session_id); }}
              aria-label="Delete session"
              id={`btn-delete-session-${s.session_id.slice(0, 8)}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-nav-btn" onClick={onShowAgents} id="btn-show-agents">
          <Cpu size={15} /> Agent Registry
        </button>
        <button className="sidebar-nav-btn" onClick={onShowUpload} id="btn-show-upload">
          <Upload size={15} /> File Upload
        </button>
      </div>
    </nav>
  );
}

// ─── Agent Chip ─────────────────────────────────────────────────────────────

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

// ─── Message Bubble ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: Message;
  onFeedback: (msgId: string, rating: 1 | -1) => void;
}

function MessageBubble({ msg, onFeedback }: MessageBubbleProps) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Render simple markdown (bold, italic, blockquote)
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('> ')) {
        return <blockquote key={i}>{line.slice(2)}</blockquote>;
      }
      const formatted = line
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        .map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={j}>{part.slice(1, -1)}</em>;
          }
          return part;
        });
      return <span key={i}>{formatted}{i < lines.length - 1 && <br />}</span>;
    });
  };

  return (
    <div className={`message-row ${isUser ? 'user' : ''}`} role="article" aria-label={`${msg.role} message`}>
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`} aria-hidden="true">
        {isUser ? 'U' : <Bot size={14} />}
      </div>
      <div className="message-content">
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
          {renderContent(msg.content)}
          {msg.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
        </div>
        <div className="message-meta">
          <span className="message-time">{time}</span>
          {!isUser && !msg.isStreaming && (
            <div className="feedback-row" role="group" aria-label="Message feedback">
              <button
                className={`feedback-btn ${msg.feedback === 1 ? 'active-up' : ''}`}
                onClick={() => onFeedback(msg.id, 1)}
                aria-label="Thumbs up"
                id={`btn-feedback-up-${msg.id.slice(0, 8)}`}
              >
                <ThumbsUp size={13} />
              </button>
              <button
                className={`feedback-btn ${msg.feedback === -1 ? 'active-down' : ''}`}
                onClick={() => onFeedback(msg.id, -1)}
                aria-label="Thumbs down"
                id={`btn-feedback-down-${msg.id.slice(0, 8)}`}
              >
                <ThumbsDown size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="message-row" aria-label="AI is typing">
      <div className="message-avatar ai-avatar" aria-hidden="true"><Bot size={14} /></div>
      <div className="typing-indicator" aria-live="polite" aria-label="Generating response">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

// ─── Welcome Screen ──────────────────────────────────────────────────────────

const STARTERS = [
  'What agents are available?',
  'Analyze the latest sales data',
  'Search enterprise documents for Q3 report',
  'Summarize recent Jira tickets',
];

interface WelcomeScreenProps { onPrompt: (p: string) => void; }

function WelcomeScreen({ onPrompt }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen" role="main">
      <div className="welcome-glow" aria-hidden="true">
        <Network size={36} color="#fff" />
      </div>
      <h1 className="welcome-title">AI Platform Local LLM</h1>
      <p className="welcome-sub">
        A local LLM Orchestration Platform.
      </p>
      <div className="welcome-pills" role="list" aria-label="Suggested prompts">
        {STARTERS.map((s) => (
          <button
            key={s}
            className="welcome-pill"
            role="listitem"
            onClick={() => onPrompt(s)}
            id={`btn-starter-${s.slice(0, 10).replace(/\s/g, '-').toLowerCase()}`}
          >
            {s}
          </button>
        ))}
      </div>
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
  const inputRef = useRef<HTMLInputElement>(null);

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
          <div className="drop-zone-icon"><Upload size={32} /></div>
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

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial data
  useEffect(() => {
    fetchSessions().then(setSessions).catch(console.warn);
    fetchAgents().then(setAgents).catch(console.warn);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const refreshSessions = useCallback(async () => {
    const s = await fetchSessions().catch(() => []);
    setSessions(s);
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId('');
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    setActiveSessionId(sid);
    const msgs = await fetchSession(sid).catch(() => []);
    setMessages(msgs.map((m) => ({
      id: uuidv4(),
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
    })));
  }, []);

  const deleteSession = useCallback(async (sid: string) => {
    await apiDeleteSession(sid).catch(console.warn);
    if (sid === activeSessionId) startNewChat();
    await refreshSessions();
  }, [activeSessionId, refreshSessions, startNewChat]);

  const submitMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;
    setInput('');

    const sid = activeSessionId || uuidv4();
    if (!activeSessionId) setActiveSessionId(sid);

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };

    const streamingMsgId = uuidv4();
    const streamingMsg: Message = {
      id: streamingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, streamingMsg]);
    setIsStreaming(true);

    try {
      await streamChat(
        prompt.trim(),
        sid,
        (token) => {
          setMessages((prev) =>
            prev.map((m) => m.id === streamingMsgId
              ? { ...m, content: m.content + token }
              : m
            )
          );
        },
        async () => {
          setMessages((prev) =>
            prev.map((m) => m.id === streamingMsgId ? { ...m, isStreaming: false } : m)
          );
          setIsStreaming(false);
          await refreshSessions();
        }
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === streamingMsgId
          ? { ...m, content: '⚠️ Failed to connect to the API. Make sure the backend is running on port 8000.', isStreaming: false }
          : m
        )
      );
      setIsStreaming(false);
    }
  }, [activeSessionId, isStreaming, refreshSessions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const handleFeedback = useCallback(async (msgId: string, rating: 1 | -1) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, feedback: rating } : m)
    );
    await sendFeedback(activeSessionId, rating).catch(console.warn);
  }, [activeSessionId]);

  // File upload
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

  const uploadedCount = pendingFiles.filter((f) => f.done).length;

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={startNewChat}
        onSelectSession={loadSession}
        onDeleteSession={deleteSession}
        onShowAgents={() => setShowAgents(true)}
        onShowUpload={() => setShowUpload(true)}
      />

      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">
            {activeSessionId ? 'Conversation' : 'AI Platform Chat'}
          </h1>
          <AgentChips />
        </header>

        <div className="chat-area" role="log" aria-live="polite" aria-label="Chat messages">
          {messages.length === 0
            ? <WelcomeScreen onPrompt={submitMessage} />
            : (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    onFeedback={handleFeedback}
                  />
                ))}

                {isStreaming && messages[messages.length - 1]?.content === '' && (
                  <TypingIndicator />
                )}
              </>
            )}
          <div ref={chatBottomRef} aria-hidden="true" />
        </div>

        <div className="input-area">
          {uploadedCount > 0 && (
            <div className="upload-files-row">
              {pendingFiles.filter((f) => f.done).map((f) => (
                <div key={f.id} className="file-chip">
                  <CheckCircle size={12} color="var(--success)" />
                  {f.file.name}
                  <button
                    onClick={() => setPendingFiles((prev) => prev.filter((p) => p.id !== f.id))}
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-wrapper">
            <button
              className="upload-btn"
              onClick={() => setShowUpload(true)}
              aria-label="Attach file"
              id="btn-attach-file"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — the Orchestrator will route to the best agent…"
              disabled={isStreaming}
              rows={1}
              aria-label="Chat input"
              id="chat-input"
            />
            <button
              className="send-btn"
              onClick={() => submitMessage(input)}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              id="btn-send"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="input-hints">
            <span className="input-hint-text">Enter to send · Shift+Enter for newline</span>
            <span className="input-hint-text" aria-live="polite">
              {isStreaming ? '⚡ Generating...' : ''}
            </span>
          </div>
        </div>
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
