import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, Paperclip, X, Network, Loader2, FileText, HardDrive } from 'lucide-react';
import type { Message } from '../types';
import { streamChat, sendFeedback, fetchSession, fetchDocuments, recordNegativeFeedback, type UserDocument } from '../api';
import { MessageBubble } from '../components/MessageBubble';
import { useAuth } from '../context/AuthContext';

// ─── Welcome Screen ──────────────────────────────────────────────────────────
const STARTERS = [
  'What agents are available?',
  'Analyze the latest sales data',
  'Search enterprise documents for Q3 report',
  'Summarize recent Jira tickets',
];

interface WelcomeScreenProps {
  onPrompt: (p: string) => void;
}

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

// ─── Chat Page Component ──────────────────────────────────────────────────────
interface ChatProps {
  activeSessionId: string;
  onSessionCreated: (id: string) => void;
  refreshSessions: () => Promise<void>;
  onShowUpload: () => void;
}

export function Chat({
  activeSessionId,
  onSessionCreated,
  refreshSessions,
  onShowUpload,
}: ChatProps) {
  const { user, deductCredit } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const isCreditsExhausted = !!(user && user.role !== 'admin' && user.credits <= 0);
  const [availableDocs, setAvailableDocs] = useState<UserDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);

  const refreshAvailableDocs = useCallback(async () => {
    try {
      const res = await fetchDocuments(user?.id ? String(user.id) : (user?.email || "default_user"));
      setAvailableDocs(res.documents || []);
    } catch {}
  }, []);

  useEffect(() => {
    refreshAvailableDocs();
  }, [refreshAvailableDocs]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastLoadedSessionIdRef = useRef<string>('');

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load session messages when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      // If this session was just initialized locally in submitMessage, don't overwrite in-flight messages
      if (activeSessionId === lastLoadedSessionIdRef.current) {
        return;
      }
      lastLoadedSessionIdRef.current = activeSessionId;
      fetchSession(activeSessionId, user?.id ? String(user.id) : user?.email)
        .then((msgs) => {
          setMessages(
            msgs.map((m) => ({
              id: uuidv4(),
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
              model: m.model,
              routed_to: m.routed_to as any,
              complexity_score: m.complexity_score,
            }))
          );
        })
        .catch(console.warn);
    } else {
      lastLoadedSessionIdRef.current = '';
      setMessages([]);
    }
  }, [activeSessionId]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const submitMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isStreaming || isCreditsExhausted) return;
    setInput('');

    // If there is no active session yet, create one
    const sid = activeSessionId || uuidv4();
    if (!activeSessionId) {
      lastLoadedSessionIdRef.current = sid; // Mark as locally initialized so useEffect won't wipe state
      onSessionCreated(sid);
    }

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
            prev.map((m) =>
              m.id === streamingMsgId ? { ...m, content: m.content + token } : m
            )
          );
        },
        async (_sid, meta) => {
          const finalTokens = meta?.usage?.total_tokens || ((meta?.usage?.prompt_tokens || 0) + (meta?.usage?.completion_tokens || 0)) || 0;
          setMessages((prev) => {
            return prev.map((m) =>
              m.id === streamingMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    routed_to: meta?.routed_to || m.routed_to,
                    model: meta?.model || m.model,
                    complexity_score: meta?.complexity_score ?? m.complexity_score,
                  }
                : m
            );
          });
          
          deductCredit(1, finalTokens);
          setIsStreaming(false);
          await refreshSessions();
        },
        (meta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgId
                ? {
                    ...m,
                    routed_to: meta.routed_to || m.routed_to,
                    model: meta.model || m.model,
                    complexity_score: meta.complexity_score ?? m.complexity_score,
                  }
                : m
            )
          );
        },
        selectedDocIds,
        user?.id ? String(user.id) : user?.email
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgId
            ? {
                ...m,
                content: '⚠️ Failed to connect to the API. Make sure the backend is running on port 8000.',
                isStreaming: false,
              }
            : m
        )
      );
      setIsStreaming(false);
    }
  }, [activeSessionId, isStreaming, isCreditsExhausted, onSessionCreated, deductCredit, refreshSessions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const handleFeedback = useCallback(async (msgId: string, rating: 1 | -1) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      const targetMsg = prev[idx];
      const prevUserMsg = idx > 0 && prev[idx - 1].role === 'user' ? prev[idx - 1] : null;

      if (rating === -1 && targetMsg) {
        recordNegativeFeedback({
          id: uuidv4(),
          session_id: activeSessionId || 'session_' + Date.now(),
          user_id: user?.id ? String(user.id) : (user?.email || 'anonymous'),
          user_email: user?.email || '',
          username: user?.username || 'User',
          user_prompt: prevUserMsg ? prevUserMsg.content : 'Question prompt unavailable',
          assistant_response: targetMsg.content,
          rating: -1,
          model: targetMsg.model || (targetMsg.routed_to === 'local' ? 'Qwen 2.5 7B' : 'Gemini 2.5 Flash'),
          routed_to: targetMsg.routed_to || 'local',
          created_at: new Date().toISOString(),
          status: 'open',
        });
      }

      return prev.map((m) => (m.id === msgId ? { ...m, feedback: rating } : m));
    });

    await sendFeedback(activeSessionId, rating, undefined, user?.id ? String(user.id) : user?.email).catch(console.warn);
  }, [activeSessionId, user]);

  

  return (
    <>
      <div className="chat-area" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <WelcomeScreen onPrompt={submitMessage} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onFeedback={handleFeedback} />
            ))}
          </>
        )}
        <div ref={chatBottomRef} aria-hidden="true" />
      </div>

      <div className="input-area">
        {isCreditsExhausted && (
          <div className="credits-exhausted-banner" style={{
            padding: '10px 16px',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            borderRadius: 'var(--r-md)',
            color: 'var(--danger)',
            fontSize: '0.82rem',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            animation: 'fadeSlideIn 0.2s ease'
          }}>
            <span>⚠️</span> Your credits are exhausted. Please contact an administrator to configure credits.
          </div>
        )}

        {/* Attached RAG Document Pills */}
        {selectedDocIds.length > 0 && (
          <div className="attached-docs-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            {availableDocs.filter(d => selectedDocIds.includes(d.id)).map(doc => (
              <div key={doc.id} className="file-chip" style={{ background: "rgba(19, 62, 66, 0.08)", border: "1px solid rgba(19, 62, 66, 0.2)", borderRadius: "var(--r-full)", padding: "3px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary-dark)", fontWeight: 600 }}>
                <FileText size={12} color="var(--accent)" />
                <span>{doc.filename}</span>
                <button onClick={() => setSelectedDocIds(prev => prev.filter(id => id !== doc.id))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text-secondary)" }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-wrapper" style={{ position: "relative" }}>
          {/* Document Context Attachment Popover */}
          {showDocPicker && (
            <div className="doc-picker-popover" style={{
              position: "absolute",
              bottom: "100%",
              left: "0",
              marginBottom: "8px",
              background: "var(--bg-base)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--r-md)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "12px",
              minWidth: "280px",
              maxWidth: "360px",
              zIndex: 50,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid var(--glass-border)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary-dark)" }}>Attach Context Documents</span>
                <button onClick={() => setShowDocPicker(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <X size={14} />
                </button>
              </div>

              {availableDocs.length === 0 ? (
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", padding: "8px 0", textAlign: "center" }}>
                  No indexed documents found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                  {availableDocs.map(d => {
                    const isSelected = selectedDocIds.includes(d.id);
                    return (
                      <label key={d.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", padding: "4px 6px", borderRadius: "var(--r-sm)", cursor: "pointer", background: isSelected ? "rgba(19, 62, 66, 0.06)" : "transparent" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedDocIds(prev => prev.filter(id => id !== d.id));
                            } else {
                              setSelectedDocIds(prev => [...prev, d.id]);
                            }
                          }}
                        />
                        <FileText size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary-dark)" }}>{d.filename}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => { setShowDocPicker(false); onShowUpload(); }}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "rgba(19, 62, 66, 0.05)",
                  border: "1px solid rgba(19, 62, 66, 0.15)",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <HardDrive size={13} /> Manage / Upload Documents
              </button>
            </div>
          )}

          <button
            className="upload-btn"
            onClick={() => { setShowDocPicker(!showDocPicker); refreshAvailableDocs(); }}
            aria-label="Attach file"
            id="btn-attach-file"
            disabled={isCreditsExhausted}
          >
            <Paperclip size={18} />
          </button>
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCreditsExhausted ? "Credits exhausted — please recharge to chat" : "Ask anything — the Orchestrator will route to the best agent…"}
            disabled={isStreaming || isCreditsExhausted}
            rows={1}
            aria-label="Chat input"
            id="chat-input"
          />
          <button
            className={`send-btn ${isStreaming ? 'executing' : ''}`}
            onClick={() => submitMessage(input)}
            disabled={!input.trim() || isStreaming || isCreditsExhausted}
            aria-label={isStreaming ? 'Agent is executing' : 'Send message'}
            id="btn-send"
          >
            {isStreaming ? <Loader2 size={16} className="btn-spinner" /> : <Send size={16} />}
          </button>
        </div>

        <div className="input-hints">
          <span className="input-hint-text">Enter to send · Shift+Enter for newline</span>
          <span className="input-hint-text executing-status-text" aria-live="polite">
            {isStreaming && (
              <span className="executing-indicator-chip">
                <span className="executing-dot" />
                Agent is executing…
              </span>
            )}
          </span>
        </div>
      </div>
    </>
  );
}
