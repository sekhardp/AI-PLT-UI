import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, Paperclip, CheckCircle, X, Network, Loader2 } from 'lucide-react';
import type { Message, UploadedFile } from '../types';
import { streamChat, sendFeedback, fetchSession } from '../api';
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
  pendingFiles: UploadedFile[];
  setPendingFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onShowUpload: () => void;
}

export function Chat({
  activeSessionId,
  onSessionCreated,
  refreshSessions,
  pendingFiles,
  setPendingFiles,
  onShowUpload,
}: ChatProps) {
  const { user, deductCredit } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const isCreditsExhausted = !!(user && user.role !== 'admin' && user.credits <= 0);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load session messages when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      fetchSession(activeSessionId)
        .then((msgs) => {
          setMessages(
            msgs.map((m) => ({
              id: uuidv4(),
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
            }))
          );
        })
        .catch(console.warn);
    } else {
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
        async () => {
          let finalTokens = 0;
          setMessages((prev) => {
            const finalMsg = prev.find((m) => m.id === streamingMsgId);
            const generatedText = finalMsg ? finalMsg.content : '';
            finalTokens = Math.max(1, Math.ceil(generatedText.length / 4));
            return prev.map((m) => (m.id === streamingMsgId ? { ...m, isStreaming: false } : m));
          });
          
          deductCredit(1, finalTokens);
          setIsStreaming(false);
          await refreshSessions();
        }
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
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: rating } : m))
    );
    await sendFeedback(activeSessionId, rating).catch(console.warn);
  }, [activeSessionId]);

  const uploadedCount = pendingFiles.filter((f) => f.done).length;

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

        {uploadedCount > 0 && (
          <div className="upload-files-row">
            {pendingFiles
              .filter((f) => f.done)
              .map((f) => (
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
            onClick={onShowUpload}
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
