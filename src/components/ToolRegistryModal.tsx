import React, { useState } from 'react';
import {
  X,
  Wrench,
  RefreshCw,
  GitBranch,
  Database,
  Search,
  CheckCircle2,
  FileText,
  Layers,
  Sparkles,
  Server,
} from 'lucide-react';
import type { Agent } from '../types';

interface ToolRegistryModalProps {
  agents: Agent[];
  onClose: () => void;
  onRefresh?: () => Promise<void>;
}

interface FormattedToolItem {
  id: string;
  displayName: string;
  category: string;
  serverName: string;
  rawIdentifier: string;
  description: string;
  isOrchestrator: boolean;
  capabilities: string[];
  status: string;
  icon: React.ReactNode;
}

function parseToolItem(item: Agent): FormattedToolItem {
  const rawName = item.name || '';
  const isOrchestrator =
    item.type === 'orchestrator' ||
    rawName.toLowerCase().includes('orchestrator') ||
    item.agent_id === 'orchestrator';

  if (isOrchestrator) {
    return {
      id: item.agent_id,
      displayName: 'Agent Orchestrator',
      category: 'Lead Orchestrator',
      serverName: 'Platform Core',
      rawIdentifier: 'orchestrator',
      description:
        item.description ||
        'Analyzes user intent, coordinates specialized MCP tools and data connectors, and synthesizes grounded answers using Gemini.',
      isOrchestrator: true,
      capabilities: item.capabilities || ['routing', 'task-decomposition', 'mcp-orchestration', 'synthesis'],
      status: item.status || 'active',
      icon: <GitBranch size={17} color="#fff" />,
    };
  }

  // Clean raw MCP Agent prefix
  const cleanName = rawName.replace(/^MCP\s+Agent\s*-\s*/i, '').trim();
  let serverName = 'MCP Server';
  let toolIdentifier = cleanName;

  if (cleanName.includes('__')) {
    const parts = cleanName.split('__');
    serverName = parts[0];
    toolIdentifier = parts.slice(1).join('__');
  } else if (cleanName.includes(':')) {
    const parts = cleanName.split(':');
    serverName = parts[0];
    toolIdentifier = parts.slice(1).join(':');
  }

  // Generate readable title from tool identifier
  const readableTitle = toolIdentifier
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Determine category & icon
  let category = 'MCP Tool';
  let icon = <Wrench size={17} color="#fff" />;

  const lower = (toolIdentifier + ' ' + serverName).toLowerCase();
  if (lower.includes('search') || lower.includes('knowledge') || lower.includes('rag')) {
    category = 'RAG Knowledge Tool';
    icon = <Search size={17} color="#fff" />;
  } else if (lower.includes('vector') || lower.includes('status') || lower.includes('check')) {
    category = 'Document Indexing Tool';
    icon = <CheckCircle2 size={17} color="#fff" />;
  } else if (lower.includes('list') || lower.includes('document') || lower.includes('file')) {
    category = 'Document Management Tool';
    icon = <FileText size={17} color="#fff" />;
  } else if (lower.includes('bigquery') || lower.includes('query') || lower.includes('sql') || lower.includes('telemetry')) {
    category = 'BigQuery Analytics Tool';
    icon = <Database size={17} color="#fff" />;
  } else if (lower.includes('presentation') || lower.includes('slide')) {
    category = 'Presentation Tool';
    icon = <Layers size={17} color="#fff" />;
  }

  return {
    id: item.agent_id,
    displayName: readableTitle,
    category,
    serverName,
    rawIdentifier: cleanName,
    description: item.description || 'Executes specialized telemetry queries and data operations for the Agent Orchestrator.',
    isOrchestrator: false,
    capabilities: item.capabilities?.filter((c) => c !== 'mcp-tool' && c !== cleanName) || [],
    status: item.status || 'active',
    icon,
  };
}

export function ToolRegistryModal({ agents, onClose, onRefresh }: ToolRegistryModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };
  const parsedItems = agents.map(parseToolItem);

  const orchestrator = parsedItems.find((i) => i.isOrchestrator) || {
    id: 'orchestrator',
    displayName: 'Agent Orchestrator',
    category: 'Lead Orchestrator',
    serverName: 'Platform Core',
    rawIdentifier: 'orchestrator',
    description: 'Analyzes user intent, coordinates specialized MCP tools, and synthesizes answers.',
    isOrchestrator: true,
    capabilities: ['routing', 'task-decomposition', 'mcp-orchestration', 'synthesis'],
    status: 'active',
    icon: <GitBranch size={17} color="#fff" />,
  };

  const mcpTools = parsedItems.filter((i) => !i.isOrchestrator);

  return (
    <div className="panel-overlay" role="dialog" aria-modal="true" aria-label="Tool & Capability Registry">
      <div className="panel tool-registry-panel">
        <div className="panel-header">
          <div className="tool-registry-header-title">
            <div className="tool-registry-icon-badge">
              <Wrench size={16} />
            </div>
            <div>
              <h2 className="panel-title">Tool & Capability Registry</h2>
              <p className="tool-registry-subtitle">
                Connected MCP tools and data connectors available to the Agent Orchestrator
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRefresh && (
              <button
                className="panel-close-btn"
                onClick={handleRefresh}
                title="Refresh connected tools from MCP gateway"
                disabled={isRefreshing}
                style={{ cursor: isRefreshing ? 'wait' : 'pointer' }}
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
            <button className="panel-close-btn" onClick={onClose} aria-label="Close tool registry" id="btn-close-tools">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="tool-registry-body">
          {/* ─── 1. Lead Orchestrator Card ────────────────────────────────────── */}
          <div className="tool-section-label">
            <Sparkles size={13} />
            <span>Lead Agent Coordinator</span>
          </div>

          <div className="tool-card orchestrator-card">
            <div className="tool-card-icon orchestrator">
              {orchestrator.icon}
            </div>
            <div className="tool-card-content">
              <div className="tool-card-top-row">
                <div className="tool-name-group">
                  <span className="tool-display-name">{orchestrator.displayName}</span>
                  <span className="tool-badge orchestrator">Brain</span>
                  <span className="tool-server-pill">Core Engine</span>
                </div>
                <div className="tool-status active">
                  <span className="status-dot-emerald" />
                  <span>active</span>
                </div>
              </div>

              <div className="tool-description">{orchestrator.description}</div>

              <div className="tool-caps-row">
                {orchestrator.capabilities.map((c) => (
                  <span key={c} className="tool-cap-tag orchestrator">{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── 2. Connected MCP Tools ───────────────────────────────────────── */}
          <div className="tool-section-label" style={{ marginTop: '16px' }}>
            <Server size={13} />
            <span>Connected MCP Tools ({mcpTools.length})</span>
          </div>

          <div className="tool-cards-list">
            {mcpTools.length === 0 && (
              <div className="tool-empty-state">
                No external MCP tools currently connected.
              </div>
            )}

            {mcpTools.map((tool) => (
              <div key={tool.id} className="tool-card mcp-tool-card">
                <div className={`tool-card-icon ${tool.category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {tool.icon}
                </div>
                <div className="tool-card-content">
                  <div className="tool-card-top-row">
                    <div className="tool-name-group">
                      <span className="tool-display-name">{tool.displayName}</span>
                      <span className="tool-badge mcp">Tool</span>
                      <span className="tool-server-pill">{tool.serverName}</span>
                    </div>
                    <div className="tool-status active">
                      <span className="status-dot-emerald" />
                      <span>active</span>
                    </div>
                  </div>

                  <div className="tool-raw-identifier">
                    <code>{tool.rawIdentifier}</code>
                  </div>

                  <div className="tool-description">{tool.description}</div>

                  {tool.capabilities.length > 0 && (
                    <div className="tool-caps-row">
                      {tool.capabilities.map((c) => (
                        <span key={c} className="tool-cap-tag">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
