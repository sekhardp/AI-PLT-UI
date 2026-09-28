import { useState } from 'react';
import {
  Sparkles,
  User,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Cpu,
  FileText,
  Database,
  Search,
  Presentation,
  Wrench,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import { normalizeMarkdown } from '../utils/markdownUtils';
import { MarkdownTable, MarkdownTableCell, MarkdownPreBlock } from './MarkdownComponents';

interface MessageBubbleProps {
  msg: Message;
  onFeedback: (msgId: string, rating: 1 | -1) => void;
}

/** Prettify raw MCP tool names into clean human-readable domain titles */
function getToolMeta(toolName: string): { label: string; group: string; icon: React.ReactNode } {
  const name = toolName.toLowerCase();

  if (name.includes('monthly_spend_trend')) {
    return { label: 'Monthly Spend Trend', group: 'BigQuery', icon: <Database size={12} color="var(--accent)" /> };
  }
  if (name.includes('executive_dashboard')) {
    return { label: 'Executive Dashboard KPI', group: 'BigQuery', icon: <Database size={12} color="var(--accent)" /> };
  }
  if (name.includes('procurement_kpi')) {
    return { label: 'Procurement KPIs', group: 'BigQuery', icon: <Database size={12} color="var(--accent)" /> };
  }
  if (name.includes('enterprise_spend_fact')) {
    return { label: 'Enterprise Spend Fact', group: 'BigQuery', icon: <Database size={12} color="var(--accent)" /> };
  }
  if (name.includes('supplier_risk')) {
    return { label: 'Supplier Risk Assessment', group: 'BigQuery', icon: <Database size={12} color="var(--accent)" /> };
  }
  if (name.includes('savings_opportunity')) {
    return { label: 'Savings Opportunities', group: 'BigQuery', icon: <Database size={12} color="var(--accent)" /> };
  }
  if (name.includes('search_knowledge_base') || name.includes('rag_server')) {
    return { label: 'Knowledge Base Search', group: 'RAG', icon: <Search size={12} color="hsl(188, 93%, 84%)" /> };
  }
  if (name.includes('compile_deck') || name.includes('pptx') || name.includes('ppt_server')) {
    return { label: 'Presentation Compiler', group: 'PowerPoint', icon: <Presentation size={12} color="var(--accent)" /> };
  }
  if (name.includes('validate_presentation')) {
    return { label: 'Presentation Validator', group: 'Schema', icon: <Check size={12} color="var(--success)" /> };
  }

  // Generic fallback
  const clean = toolName.replace(/^.*__/, '').replace(/_/g, ' ');
  return { label: clean, group: 'Tool', icon: <Wrench size={12} color="var(--accent)" /> };
}

function formatArgsSummary(args?: Record<string, any>): string | null {
  if (!args || Object.keys(args).length === 0) return null;
  const entries = Object.entries(args)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const strVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
      const cleanVal = strVal.length > 35 ? strVal.slice(0, 32) + '…' : strVal;
      return `${k}: ${cleanVal}`;
    });
  return entries.length > 0 ? entries.join(' · ') : null;
}

export function MessageBubble({ msg, onFeedback }: MessageBubbleProps) {
  const [showToolDrawer, setShowToolDrawer] = useState(false);
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const hasContent = Boolean(msg.content && msg.content.trim());
  const isThinking = !isUser && msg.isStreaming && !hasContent;
  const normalizedContent = normalizeMarkdown(msg.content, msg.isStreaming);
  const toolEvents = msg.toolEvents || [];
  const hasTools = toolEvents.length > 0;

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

        {/* ─── Completed Message: Collapsible Tool Execution Drawer ──────────────── */}
        {!isUser && !msg.isStreaming && hasTools && (
          <div className="tool-collapsible-drawer">
            <button
              type="button"
              className="tool-collapsible-header"
              onClick={() => setShowToolDrawer(!showToolDrawer)}
              aria-expanded={showToolDrawer}
            >
              <div className="tool-collapsible-header-left">
                <Wrench size={12} color="var(--accent)" />
                <span className="tool-collapsible-title">
                  {toolEvents.length} {toolEvents.length === 1 ? 'tool' : 'tools'} executed to ground response
                </span>
              </div>
              <div className="tool-collapsible-header-right">
                <span className="tool-collapsible-toggle-text">
                  {showToolDrawer ? 'Hide execution details' : 'View execution trace'}
                </span>
                {showToolDrawer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </button>

            {showToolDrawer && (
              <div className="tool-collapsible-body">
                {toolEvents.map((tool, idx) => {
                  const meta = getToolMeta(tool.tool_name);
                  const argsSummary = formatArgsSummary(tool.arguments);
                  return (
                    <div key={tool.id || idx} className="tool-step-item done">
                      <div className="tool-step-icon-badge">
                        {meta.icon}
                      </div>
                      <div className="tool-step-content">
                        <div className="tool-step-header-line">
                          <span className="tool-step-name">{meta.label}</span>
                          <span className="tool-step-group-pill">{meta.group}</span>
                          {tool.duration_ms !== undefined && (
                            <span className="tool-step-duration">{tool.duration_ms}ms</span>
                          )}
                          <span className="tool-step-status success">
                            <Check size={11} /> Done
                          </span>
                        </div>
                        {argsSummary && (
                          <div className="tool-step-args">
                            <code>{argsSummary}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Active Streaming State: Live Tool Steps + Thinking Progress ────────── */}
        {isThinking ? (
          <div className="agent-thinking-card" aria-live="polite">
            <div className="agent-thinking-header">
              <div className="agent-thinking-pulse">
                <span className="pulse-wave wave-1" />
                <span className="pulse-wave wave-2" />
                <span className="pulse-wave wave-3" />
              </div>
              <div className="agent-thinking-info">
                <span className="thinking-primary-text">
                  {hasTools
                    ? `Executing ${toolEvents.find((t) => t.status === 'running') ? getToolMeta(toolEvents.find((t) => t.status === 'running')!.tool_name).label : 'agent tools'}…`
                    : msg.routed_to === 'ai_router'
                    ? 'AI Router is analyzing query complexity…'
                    : msg.routed_to === 'local'
                    ? `Executing on Local LLM (${msg.model ? msg.model.split('/').pop() : 'Qwen 2.5 7B'})…`
                    : msg.routed_to === 'frontier'
                    ? `Executing on Frontier Model (${msg.model ? msg.model.split('/').pop() : 'Gemini 2.5 Pro'})…`
                    : 'Orchestrator is executing…'}
                </span>
                <span className="thinking-secondary-text">
                  {hasTools
                    ? 'Fetching live BigQuery telemetry & RAG knowledge base insights'
                    : msg.routed_to === 'ai_router'
                    ? 'Evaluating query complexity & tool requirements to select model tier'
                    : msg.routed_to === 'local'
                    ? 'Fast low-latency inference on dedicated Compute Engine GPU'
                    : msg.routed_to === 'frontier'
                    ? 'Deep analytical reasoning synthesized on Vertex AI'
                    : 'Routing query to specialized agents & synthesizing response'}
                </span>
              </div>
            </div>

            {/* Live Tool Progress Step List */}
            {hasTools && (
              <div className="live-tool-steps-container">
                {toolEvents.map((tool, idx) => {
                  const meta = getToolMeta(tool.tool_name);
                  const argsSummary = formatArgsSummary(tool.arguments);
                  const isRunning = tool.status === 'running';
                  return (
                    <div key={tool.id || idx} className={`tool-step-item ${isRunning ? 'running' : 'done'}`}>
                      <div className="tool-step-icon-badge">
                        {isRunning ? (
                          <Loader2 size={12} className="spin-fast" color="var(--accent)" />
                        ) : (
                          meta.icon
                        )}
                      </div>
                      <div className="tool-step-content">
                        <div className="tool-step-header-line">
                          <span className="tool-step-name">{meta.label}</span>
                          <span className="tool-step-group-pill">{meta.group}</span>
                          {tool.duration_ms !== undefined && (
                            <span className="tool-step-duration">{tool.duration_ms}ms</span>
                          )}
                          <span className={`tool-step-status ${isRunning ? 'running' : 'success'}`}>
                            {isRunning ? (
                              <>
                                <span className="active-dot" /> Calling…
                              </>
                            ) : (
                              <>
                                <Check size={11} /> Done
                              </>
                            )}
                          </span>
                        </div>
                        {argsSummary && (
                          <div className="tool-step-args">
                            <code>{argsSummary}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: MarkdownTable,
                  td: MarkdownTableCell,
                  pre: (props: any) => <MarkdownPreBlock {...props} isStreaming={msg.isStreaming} />,
                }}
              >
                {normalizedContent}
              </ReactMarkdown>
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
