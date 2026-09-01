import { Sparkles, User, ThumbsUp, ThumbsDown, Zap, Cpu, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';

interface MessageBubbleProps {
  msg: Message;
  onFeedback: (msgId: string, rating: 1 | -1) => void;
}

export function MessageBubble({ msg, onFeedback }: MessageBubbleProps) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isThinking = !isUser && msg.isStreaming && !msg.content.trim();

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`} role="article" aria-label={`${msg.role} message`}>
      <div className="message-content">
        {!isUser && (
          <div className="message-author-header">
            <span className="author-badge ai-badge">
              <span className="sparkle-pulse"><Sparkles size={13} /></span>
              <span className="author-name">AI Orchestrator</span>
            </span>
            {msg.routed_to === 'ai_router' && (
              <span
                className="author-status-pill"
                style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                <Sparkles size={11} className="spin-slow" />
                AI Router
              </span>
            )}
            {msg.routed_to === 'local' && (
              <span
                className="author-status-pill"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                <Zap size={11} />
                Local LLM ({msg.model ? msg.model.split('/').pop() : 'Qwen 2.5 7B'})
              </span>
            )}
            {msg.routed_to === 'frontier' && (
              <span
                className="author-status-pill"
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                <Cpu size={11} />
                Frontier ({msg.model ? msg.model.split('/').pop() : 'Gemini 2.5 Flash'})
              </span>
            )}
            {msg.isStreaming && !msg.routed_to && (
              <span className="author-status-pill">Executing</span>
            )}
          </div>
        )}
        {isUser && (
          <div className="message-author-header user-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="author-badge user-badge">
              <User size={12} />
              <span className="author-name">You</span>
            </span>
            {msg.attachedDocs && msg.attachedDocs.length > 0 && (
              <div
                className="user-attached-docs-header"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                }}
              >
                {msg.attachedDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="attached-doc-tag"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--r-full)',
                      background: 'rgba(10, 95, 107, 0.08)',
                      border: '1px solid rgba(10, 95, 107, 0.2)',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: 'var(--accent)',
                    }}
                    title={`Attached context: ${doc.filename}`}
                  >
                    <FileText size={10} color="var(--accent)" />
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.filename}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {isThinking ? (
          <div className="agent-thinking-card" aria-live="polite">
            <div className="agent-thinking-pulse">
              <span className="pulse-wave wave-1" />
              <span className="pulse-wave wave-2" />
              <span className="pulse-wave wave-3" />
            </div>
            <div className="agent-thinking-info">
              <span className="thinking-primary-text">
                {msg.routed_to === 'ai_router'
                  ? 'AI Router is analyzing query complexity…'
                  : msg.routed_to === 'local'
                  ? `Executing on Local LLM (${msg.model ? msg.model.split('/').pop() : 'Qwen 2.5 7B'})…`
                  : msg.routed_to === 'frontier'
                  ? `Executing on Frontier Model (${msg.model ? msg.model.split('/').pop() : 'Gemini 2.5 Flash'})…`
                  : 'Orchestrator is executing…'}
              </span>
              <span className="thinking-secondary-text">
                {msg.routed_to === 'ai_router'
                  ? 'Evaluating query complexity & tool requirements to select model tier'
                  : msg.routed_to === 'local'
                  ? 'Fast low-latency inference on dedicated Compute Engine GPU'
                  : msg.routed_to === 'frontier'
                  ? 'Deep analytical reasoning synthesized on Vertex AI'
                  : 'Routing query to specialized agents & synthesizing response'}
              </span>
            </div>
          </div>
        ) : (
          <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
            <div className="markdown-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
          </div>
        )}
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
