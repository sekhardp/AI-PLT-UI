import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Shield,
  CreditCard,
  Zap,
  HardDrive,
  Cpu,
  RefreshCw,
  LogOut,
  Check,
  CheckCircle2,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDocuments, fetchAgents, fetchSessions, type QuotaInfo } from '../api';
import type { Agent, Session } from '../types';

export function UserPage() {
  const { user, logout, refreshUsers } = useAuth();
  const navigate = useNavigate();

  const [docQuota, setDocQuota] = useState<QuotaInfo | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const hasMountedRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  const loadUserData = useCallback(async () => {
    setIsSyncing(true);
    const activeUser = userRef.current;
    const userId = activeUser?.id ? String(activeUser.id) : (activeUser?.email || 'default_user');

    try {
      const [docsData, agentsData, sessionsData] = await Promise.all([
        fetchDocuments(userId).catch(() => ({ documents: [], quota: null })),
        fetchAgents().catch(() => []),
        fetchSessions(userId).catch(() => []),
        refreshUsers().catch(() => {}),
      ]);

      if (docsData && docsData.quota) {
        setDocQuota(docsData.quota);
      }
      setAgents(agentsData || []);
      setSessions(sessionsData || []);
      setSyncFeedback('Profile synchronized with Cloud SQL');
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch (err) {
      console.warn('Failed to load user profile data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshUsers]);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    loadUserData();
  }, [loadUserData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isLocalLlmOnline = useMemo(() => {
    return agents.some(
      (a) =>
        a.name.toLowerCase().includes('local') ||
        a.name.toLowerCase().includes('vllm') ||
        a.capabilities?.some((c) => c.toLowerCase().includes('vllm') || c.toLowerCase().includes('local'))
    );
  }, [agents]);

  if (!user) return null;

  return (
    <div className="user-page-container">
      <style>{`
        .user-page-container {
          padding: 32px 40px;
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
        }

        .user-header-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          box-shadow: var(--shadow-sm);
        }

        .user-identity-group {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .user-large-avatar {
          width: 60px;
          height: 60px;
          border-radius: var(--r-md);
          background: linear-gradient(135deg, var(--accent), #095554);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px var(--accent-glow);
          color: #fff;
          font-size: 1.45rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .user-title-block h2 {
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          letter-spacing: -0.01em;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-title-block p {
          font-size: 0.82rem;
          color: var(--text-primary-dark);
          opacity: 0.7;
          margin-top: 4px;
        }

        .user-id-chip {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--accent);
          background: rgba(10, 95, 107, 0.08);
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          display: inline-block;
        }

        .header-actions-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sync-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--r-md);
          background: rgba(19, 62, 66, 0.06);
          border: 1px solid rgba(19, 62, 66, 0.14);
          color: var(--text-primary-dark);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sync-btn:hover:not(:disabled) {
          background: rgba(19, 62, 66, 0.1);
          border-color: var(--accent);
          color: var(--accent);
        }

        .sync-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin-icon {
          animation: spinAnim 0.9s linear infinite;
        }

        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ─── Metric Highlights ─── */
        .user-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .user-kpi-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 18px 20px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.2s;
        }

        .user-kpi-card:hover {
          transform: translateY(-2px);
        }

        .user-kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          opacity: 0.75;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .user-kpi-value {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .user-kpi-footer {
          font-size: 0.72rem;
          color: var(--text-primary-dark);
          opacity: 0.65;
        }

        /* ─── Main Details Grid ─── */
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }

        .profile-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 22px;
          color: var(--text-primary-dark);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          border-bottom: 1px solid rgba(19, 62, 66, 0.08);
          padding-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
          color: var(--text-primary-dark);
        }

        .info-label {
          font-weight: 600;
          opacity: 0.75;
        }

        .info-value {
          font-weight: 600;
        }

        .role-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: var(--r-sm);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .role-pill.admin {
          background: rgba(16, 185, 129, 0.12);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .role-pill.user {
          background: rgba(19, 62, 66, 0.08);
          color: var(--text-primary-dark);
          border: 1px solid rgba(19, 62, 66, 0.14);
        }

        .status-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: var(--r-full);
          font-size: 0.68rem;
          font-weight: 700;
        }

        .status-tag.online {
          background: rgba(16, 185, 129, 0.12);
          color: #065f46;
        }

        .status-tag.standby {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }

        .storage-bar-wrap {
          margin-top: 4px;
        }

        .storage-bar {
          height: 6px;
          background: rgba(19, 62, 66, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 6px;
        }

        .storage-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), #10b981);
          border-radius: 3px;
        }

        .signout-btn {
          padding: 9px 16px;
          background: rgba(239, 68, 68, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--r-md);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
          margin-top: 8px;
        }

        .signout-btn:hover {
          background: #ef4444;
          color: #fff;
          border-color: #ef4444;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.25);
        }

        .toast-msg {
          padding: 8px 14px;
          border-radius: var(--r-md);
          font-size: 0.78rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
      `}</style>

      {/* ─── Profile Header ──────────────────────────────────────────────────── */}
      <section className="user-header-card">
        <div className="user-identity-group">
          <div className="user-large-avatar" aria-hidden="true">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="user-title-block">
            <h2>
              <span>{user.username}</span>
              <span className={`role-pill ${user.role}`}>{user.role === 'admin' ? 'Administrator' : 'Standard User'}</span>
            </h2>
            <p>
              {user.email} &bull; {user.id ? <span className="user-id-chip">Cloud SQL Account #{user.id}</span> : 'Active Session'}
            </p>
          </div>
        </div>

        <div className="header-actions-row">
          <button
            className="sync-btn"
            onClick={loadUserData}
            disabled={isSyncing}
            id="btn-sync-profile"
            title="Fetch real-time credit balance and document quota from Cloud SQL"
          >
            <RefreshCw size={14} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud SQL'}</span>
          </button>
        </div>
      </section>

      {syncFeedback && (
        <div className="toast-msg" role="status">
          <Check size={14} />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* ─── Real-Time Metric Highlights ──────────────────────────────────────── */}
      <section className="user-kpi-grid">
        <div className="user-kpi-card">
          <div className="user-kpi-header">
            <span>Credit Balance</span>
            <CreditCard size={16} color="var(--warning)" />
          </div>
          <div className="user-kpi-value" style={{ color: user.credits > 0 || user.role === 'admin' ? 'var(--text-primary-dark)' : '#b91c1c' }}>
            {user.role === 'admin' ? 'Unlimited' : user.credits}
          </div>
          <div className="user-kpi-footer">
            <span>{user.role === 'admin' ? 'Admin quota bypass' : `${user.credits} queries remaining`}</span>
          </div>
        </div>

        <div className="user-kpi-card">
          <div className="user-kpi-header">
            <span>Token Consumption</span>
            <Zap size={16} color="var(--accent)" />
          </div>
          <div className="user-kpi-value">{user.tokensUsed.toLocaleString()}</div>
          <div className="user-kpi-footer">
            <span>Total LLM tokens processed</span>
          </div>
        </div>

        <div className="user-kpi-card">
          <div className="user-kpi-header">
            <span>Knowledge Base</span>
            <HardDrive size={16} color="var(--accent)" />
          </div>
          <div className="user-kpi-value">
            {docQuota ? docQuota.total_documents : 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.6 }}>files</span>
          </div>
          <div className="user-kpi-footer">
            <span>{docQuota ? `${docQuota.total_mb.toFixed(1)} MB indexed` : '0 MB storage'}</span>
          </div>
        </div>

        <div className="user-kpi-card">
          <div className="user-kpi-header">
            <span>Chat Sessions</span>
            <MessageSquare size={16} color="var(--accent)" />
          </div>
          <div className="user-kpi-value">{sessions.length}</div>
          <div className="user-kpi-footer">
            <span>Active conversation threads</span>
          </div>
        </div>
      </section>

      {/* ─── Main Details Grid ────────────────────────────────────────────────── */}
      <div className="profile-grid">
        {/* Account Details & Cloud SQL Ledger */}
        <div className="profile-card">
          <h3 className="card-title">
            <UserIcon size={16} color="var(--accent)" /> Account & Ledger
          </h3>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Full Name</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email Address</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role Tier</span>
              <span className="info-value">
                <span className={`role-pill ${user.role}`}>
                  {user.role === 'admin' ? 'Administrator' : 'Standard Tier'}
                </span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Cloud SQL ID</span>
              <span className="info-value" style={{ fontFamily: 'var(--font-mono)' }}>
                {user.id ? `#${user.id}` : 'Local Session'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Consumption Rate</span>
              <span className="info-value" style={{ opacity: 0.8, fontSize: '0.78rem' }}>
                1 Query = 1 Credit
              </span>
            </div>
          </div>
        </div>

        {/* Enterprise RAG Document Storage */}
        <div className="profile-card">
          <h3 className="card-title">
            <FileText size={16} color="var(--accent)" /> RAG Knowledge Storage
          </h3>
          {docQuota ? (
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Indexed Documents</span>
                <span className="info-value">{docQuota.total_documents} file(s)</span>
              </div>
              <div className="info-row">
                <span className="info-label">Storage Consumed</span>
                <span className="info-value">
                  {docQuota.total_mb.toFixed(1)} / {docQuota.max_mb} MB
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Remaining Quota</span>
                <span className="info-value" style={{ color: '#065f46' }}>
                  {docQuota.remaining_mb.toFixed(1)} MB available
                </span>
              </div>

              <div className="storage-bar-wrap">
                <div className="storage-bar">
                  <div
                    className="storage-bar-fill"
                    style={{ width: `${Math.min(100, (docQuota.total_mb / docQuota.max_mb) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>No document quota information available.</div>
          )}
        </div>

        {/* Connected AI Models & Routing Access */}
        <div className="profile-card">
          <h3 className="card-title">
            <Cpu size={16} color="var(--accent)" /> AI Model Permissions
          </h3>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Frontier Gateway</span>
              <span className="status-tag online">
                <CheckCircle2 size={11} /> Gemini 2.5 Flash
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Local GPU vLLM</span>
              <span className={`status-tag ${isLocalLlmOnline ? 'online' : 'standby'}`}>
                {isLocalLlmOnline ? '● Online (Qwen 2.5 7B)' : '● Standby (Routing to Frontier)'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">MCP Tool Access</span>
              <span className="info-value" style={{ fontSize: '0.78rem' }}>
                BigQuery · Weather · RAG Search
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Context Limit</span>
              <span className="info-value" style={{ fontFamily: 'var(--font-mono)' }}>
                4,096 Tokens / Turn
              </span>
            </div>
          </div>
        </div>

        {/* Security & Access Management */}
        <div className="profile-card">
          <h3 className="card-title">
            <Shield size={16} color="var(--accent)" /> Session & Security
          </h3>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Authentication</span>
              <span className="info-value" style={{ fontSize: '0.78rem' }}>
                Cloud SQL Relational RBAC
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Session Status</span>
              <span className="status-tag online">
                <CheckCircle2 size={11} /> Active
              </span>
            </div>
          </div>

          <button className="signout-btn" onClick={handleLogout} id="btn-user-logout">
            <LogOut size={14} />
            <span>Sign Out of Platform</span>
          </button>
        </div>
      </div>
    </div>
  );
}
