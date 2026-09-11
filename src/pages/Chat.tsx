import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Send,
  Paperclip,
  X,
  Network,
  FileText,
  HardDrive,
  Check,
  Square,
  Sparkles,
  Cpu,
  ChevronDown,
  Zap,
} from 'lucide-react';
import type { Message, ModelId, ModelOption } from '../types';
import {
  streamChat,
  sendFeedback,
  fetchSession,
  fetchDocuments,
  recordNegativeFeedback,
  stopChatExecution,
  type UserDocument,
} from '../api';
import { MessageBubble } from '../components/MessageBubble';
import { useAuth } from '../context/AuthContext';

// ─── Model Configuration ──────────────────────────────────────────────────────
const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'auto',
    name: 'Auto (Smart Router)',
    tier: 'auto',
    tag: 'Hybrid Auto',
    description: 'Intelligently classifies query complexity and auto-routes between local GPU and frontier models',
    speed: 'Ultra Fast',
    modelParam: 'auto',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tier: 'frontier',
    tag: 'Frontier',
    description: 'Ultra-fast multimodal reasoning, deep synthesis, and extensive document grounding',
    speed: 'Ultra Fast',
    modelParam: 'gemini-2.5-flash',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tier: 'frontier',
    tag: 'Frontier Pro',
    description: 'Deep complex logic, advanced analytical reasoning, and structured deck synthesis',
    speed: 'Deep Reasoning',
    modelParam: 'gemini-2.5-pro',
  },
  {
    id: 'qwen-2.5-7b',
    name: 'Qwen 2.5 7B (Local LLM)',
    tier: 'local',
    tag: 'Local GPU',
    description: 'Private, low-latency execution hosted on local vLLM GPU infrastructure',
    speed: 'Fast',
    modelParam: 'Qwen/Qwen2.5-7B-Instruct',
  },
];

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
        A local LLM Orchestration Platform with multi-model routing & real-time agent execution control.
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

  // Model Selection State
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(() => {
    const saved = localStorage.getItem('ai_plt_selected_model') as ModelId;
    return saved && MODEL_OPTIONS.some((m) => m.id === saved) ? saved : 'auto';
  });
  const [showModelPicker, setShowModelPicker] = useState(false);

  const isCreditsExhausted = !!(user && user.role !== 'admin' && user.credits <= 0);
  const [availableDocs, setAvailableDocs] = useState<UserDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentStreamingSidRef = useRef<string>('');
  const currentStreamingMsgIdRef = useRef<string>('');
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const docPickerRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modelPickerRef.current && !modelPickerRef.current.contains(target)) {
        const btn = document.getElementById('btn-model-selector');
        if (!btn || !btn.contains(target)) {
          setShowModelPicker(false);
        }
      }
      if (docPickerRef.current && !docPickerRef.current.contains(target)) {
        const btn = document.getElementById('btn-attach-file');
        if (!btn || !btn.contains(target)) {
          setShowDocPicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshAvailableDocs = useCallback(async () => {
    try {
      const res = await fetchDocuments(user?.id ? String(user.id) : (user?.email || 'default_user'));
      setAvailableDocs(res.documents || []);
    } catch {}
  }, [user]);

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
  }, [activeSessionId, user]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleSelectModel = (id: ModelId) => {
    setSelectedModelId(id);
    localStorage.setItem('ai_plt_selected_model', id);
    setShowModelPicker(false);
  };

  const handleStopExecution = useCallback(async () => {
    if (!isStreaming) return;
    const sid = currentStreamingSidRef.current;
    const streamingMsgId = currentStreamingMsgIdRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (sid) {
      await stopChatExecution(sid).catch(console.warn);
    }

    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamingMsgId
          ? {
              ...m,
              isStreaming: false,
              content: m.content
                ? m.content + '\n\n*(Execution stopped by user)*'
                : '*(Execution stopped by user)*',
            }
          : m
      )
    );
  }, [isStreaming]);

  // Keyboard shortcut (Escape to stop)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        handleStopExecution();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isStreaming, handleStopExecution]);

  const submitMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isStreaming || isCreditsExhausted) return;
    setInput('');

    const currentDocIds = [...selectedDocIds];
    const attachedMeta = availableDocs
      .filter((d) => currentDocIds.includes(d.id))
      .map((d) => ({ id: d.id, filename: d.filename }));

    setSelectedDocIds([]);

    const sid = activeSessionId || uuidv4();
    if (!activeSessionId) {
      lastLoadedSessionIdRef.current = sid;
      onSessionCreated(sid);
    }

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
      attachedDocs: attachedMeta.length > 0 ? attachedMeta : undefined,
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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    currentStreamingSidRef.current = sid;
    currentStreamingMsgIdRef.current = streamingMsgId;

    const activeModelOption = MODEL_OPTIONS.find((m) => m.id === selectedModelId) || MODEL_OPTIONS[0];

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
          abortControllerRef.current = null;
          const finalTokens =
            meta?.usage?.total_tokens ||
            (meta?.usage?.prompt_tokens || 0) + (meta?.usage?.completion_tokens || 0) ||
            0;
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
        currentDocIds,
        user?.id ? String(user.id) : user?.email,
        activeModelOption.modelParam,
        abortController.signal
      );
    } catch {
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgId
            ? {
                ...m,
                content: m.content || '⚠️ Failed to connect to the API. Make sure the backend is running.',
                isStreaming: false,
              }
            : m
        )
      );
      setIsStreaming(false);
    }
  }, [
    activeSessionId,
    isStreaming,
    isCreditsExhausted,
    onSessionCreated,
    deductCredit,
    refreshSessions,
    selectedDocIds,
    availableDocs,
    user,
    selectedModelId,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const handleFeedback = useCallback(
    async (msgId: string, rating: 1 | -1) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msgId);
        const targetMsg = prev[idx];
        const prevUserMsg = idx > 0 && prev[idx - 1].role === 'user' ? prev[idx - 1] : null;

        if (rating === -1 && targetMsg) {
          recordNegativeFeedback({
            id: uuidv4(),
            session_id: activeSessionId || 'session_' + Date.now(),
            user_id: user?.id ? String(user.id) : user?.email || 'anonymous',
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

      await sendFeedback(activeSessionId, rating, undefined, user?.id ? String(user.id) : user?.email).catch(
        console.warn
      );
    },
    [activeSessionId, user]
  );

  const currentModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId) || MODEL_OPTIONS[0];

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
          <div
            className="credits-exhausted-banner"
            style={{
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
              animation: 'fadeSlideIn 0.2s ease',
            }}
          >
            <span>⚠️</span> Your credits are exhausted. Please contact an administrator to configure credits.
          </div>
        )}

        {/* Attached RAG Document Pills (Visible only when documents are attached) */}
        {selectedDocIds.length > 0 && (
          <div className="attached-docs-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
            {availableDocs
              .filter((d) => selectedDocIds.includes(d.id))
              .map((doc) => (
                <div
                  key={doc.id}
                  className="file-chip"
                  style={{
                    background: 'rgba(19, 62, 66, 0.08)',
                    border: '1px solid rgba(19, 62, 66, 0.2)',
                    borderRadius: 'var(--r-full)',
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-primary-dark)',
                    fontWeight: 600,
                  }}
                >
                  <FileText size={12} color="var(--accent)" />
                  <span>{doc.filename}</span>
                  <button
                    onClick={() => setSelectedDocIds((prev) => prev.filter((id) => id !== doc.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="input-wrapper" style={{ position: 'relative' }}>
          {/* Document Context Attachment Popover */}
          {showDocPicker && (
            <div className="doc-picker-popover" ref={docPickerRef}>
              <div className="doc-picker-header">
                <div className="doc-picker-title">
                  <FileText size={15} color="var(--accent)" />
                  <span>Attach Context Documents</span>
                  {selectedDocIds.length > 0 && (
                    <span
                      style={{
                        background: 'rgba(10, 95, 107, 0.12)',
                        color: 'var(--accent)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 'var(--r-full)',
                      }}
                    >
                      {selectedDocIds.length} selected
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedDocIds.length > 0 && (
                    <button
                      onClick={() => setSelectedDocIds([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.7rem',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setShowDocPicker(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}
                    aria-label="Close document picker"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {availableDocs.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '12px 0', textAlign: 'center' }}>
                  No indexed documents found.
                </div>
              ) : (
                <div className="doc-picker-list">
                  {availableDocs.map((d) => {
                    const isSelected = selectedDocIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`doc-picker-item ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="doc-picker-checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedDocIds((prev) => prev.filter((id) => id !== d.id));
                            } else {
                              setSelectedDocIds((prev) => [...prev, d.id]);
                            }
                          }}
                        />
                        <FileText size={14} color={isSelected ? 'var(--accent)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                        <span className="doc-picker-filename">{d.filename}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedDocIds.length > 0 && (
                <button
                  className="doc-picker-done-btn"
                  onClick={() => setShowDocPicker(false)}
                  id="btn-doc-picker-done"
                >
                  <Check size={14} />
                  <span>Done ({selectedDocIds.length} {selectedDocIds.length === 1 ? 'document' : 'documents'} attached)</span>
                </button>
              )}

              <button
                className="doc-picker-manage-btn"
                onClick={() => {
                  setShowDocPicker(false);
                  onShowUpload();
                }}
              >
                <HardDrive size={13} /> Manage / Upload Documents
              </button>
            </div>
          )}

          {/* Model Selector Popover Menu */}
          {showModelPicker && (
            <div className="model-picker-popover" ref={modelPickerRef} role="dialog" aria-label="Choose AI Model">
              <div className="model-picker-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} color="var(--accent)" />
                  <span className="model-picker-title">Select AI Model</span>
                </div>
                <button
                  onClick={() => setShowModelPicker(false)}
                  className="icon-close-btn"
                  aria-label="Close model picker"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="model-picker-list">
                {MODEL_OPTIONS.map((opt) => {
                  const isSelected = opt.id === selectedModelId;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`model-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectModel(opt.id)}
                      id={`model-opt-${opt.id}`}
                    >
                      <div className="model-opt-header">
                        <div className="model-opt-title-group">
                          {opt.tier === 'local' ? (
                            <Cpu size={14} color="var(--accent)" />
                          ) : opt.id === 'gemini-2.5-pro' ? (
                            <Sparkles size={14} color="var(--accent)" />
                          ) : (
                            <Zap size={14} color="var(--accent)" />
                          )}
                          <span className="model-opt-name">{opt.name}</span>
                        </div>
                        <span className={`model-tier-badge ${opt.tier}`}>{opt.tag}</span>
                      </div>
                      <p className="model-opt-desc">{opt.description}</p>
                      <div className="model-opt-footer">
                        <span className="model-speed-tag">⚡ {opt.speed}</span>
                        {isSelected && <Check size={14} className="model-check-icon" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top: Full-Width Typing Area */}
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCreditsExhausted
                ? 'Credits exhausted — please recharge to chat'
                : `Ask anything using ${currentModel.name}…`
            }
            disabled={isStreaming || isCreditsExhausted}
            rows={1}
            aria-label="Chat input"
            id="chat-input"
          />

          {/* Bottom: Compact Action Toolbar inside Input Area */}
          <div className="input-action-bar">
            <div className="input-action-left">
              {/* Attach Document Button */}
              <button
                className="upload-btn"
                onClick={() => {
                  setShowModelPicker(false);
                  setShowDocPicker(!showDocPicker);
                  refreshAvailableDocs();
                }}
                aria-label="Attach file"
                id="btn-attach-file"
                disabled={isCreditsExhausted || isStreaming}
                title="Attach context documents"
              >
                <Paperclip size={16} />
              </button>

              {/* Compact Model Selector Pill */}
              <div className="model-selector-inline-wrap">
                <button
                  type="button"
                  className="model-selector-btn-inline"
                  onClick={() => {
                    setShowDocPicker(false);
                    setShowModelPicker(!showModelPicker);
                  }}
                  aria-expanded={showModelPicker}
                  aria-label="Select AI Model"
                  id="btn-model-selector"
                  disabled={isStreaming}
                  title={`Active Model: ${currentModel.name}`}
                >
                  {currentModel.tier === 'local' ? (
                    <Cpu size={13} color="var(--accent)" />
                  ) : currentModel.id === 'gemini-2.5-pro' ? (
                    <Sparkles size={13} color="var(--accent)" />
                  ) : (
                    <Zap size={13} color="var(--accent)" />
                  )}
                  <span className="model-selector-inline-name">
                    {currentModel.name.replace(' (Smart Router)', '').replace(' (Local LLM)', '')}
                  </span>
                  <ChevronDown size={11} className="model-dropdown-icon" />
                </button>
              </div>
            </div>

            <div className="input-action-right">
              {isStreaming ? (
                <button
                  className="stop-btn"
                  onClick={handleStopExecution}
                  aria-label="Stop agent execution"
                  id="btn-stop-execution"
                  title="Stop execution (Esc)"
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  className="send-btn"
                  onClick={() => submitMessage(input)}
                  disabled={!input.trim() || isCreditsExhausted}
                  aria-label="Send message"
                  id="btn-send"
                  title="Send message (Enter)"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="input-hints">
          <span className="input-hint-text">Enter to send · Shift+Enter for newline</span>
          <div className="executing-status-text" aria-live="polite">
            {isStreaming && (
              <div className="executing-indicator-group">
                <span className="executing-indicator-chip">
                  <span className="executing-dot" />
                  Agent executing ({currentModel.name})…
                </span>
                <button
                  type="button"
                  className="stop-pill-btn"
                  onClick={handleStopExecution}
                  id="btn-stop-pill"
                  title="Stop agent execution"
                >
                  <Square size={11} fill="currentColor" />
                  <span>Stop Execution</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
