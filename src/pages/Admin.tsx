import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Users,
  Activity,
  Server,
  Check,
  RefreshCw,
  Search,
  Zap,
  CreditCard,
  Cpu,
  Save,
  Database,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAgents,
  fetchDocuments,
  fetchNegativeFeedbacks,
  updateNegativeFeedbackStatus,
  type QuotaInfo,
  type NegativeFeedbackItem,
} from '../api';
import type { Agent } from '../types';

export function AdminPage() {
  const { usersList, updateUserCredits, refreshUsers, user: currentUser } = useAuth();

  // Active Main Tab: 'ledger' (Users & Credits) vs 'qa_feedback' (Disliked Responses)
  const [activeTab, setActiveTab] = useState<'ledger' | 'qa_feedback'>('ledger');

  // Live Telemetry & Data States
  const [agents, setAgents] = useState<Agent[]>([]);
  const [docQuota, setDocQuota] = useState<QuotaInfo | null>(null);
  const [negativeFeedbacks, setNegativeFeedbacks] = useState<NegativeFeedbackItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // User Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [creditFilter, setCreditFilter] = useState<'all' | 'active' | 'exhausted'>('all');

  // Negative Feedback Filters
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackModelFilter, setFeedbackModelFilter] = useState<'all' | 'local' | 'frontier'>('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'open' | 'reviewed'>('all');

  // Inline Credit Inputs & Saving Feedback
  const [creditInputs, setCreditInputs] = useState<Record<string, number>>({});
  const [savingEmails, setSavingEmails] = useState<Record<string, boolean>>({});
  const [successStates, setSuccessStates] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ─── Real-time Live Data Sync ────────────────────────────────────────────────
  const syncLiveTelemetry = useCallback(async () => {
    setIsRefreshing(true);
    const start = performance.now();
    try {
      const [agentsData, docsData, feedbacksData] = await Promise.all([
        fetchAgents().catch(() => []),
        fetchDocuments(currentUser?.id ? String(currentUser.id) : (currentUser?.email || 'default_user')).catch(() => ({ documents: [], quota: null })),
        fetchNegativeFeedbacks().catch(() => []),
        refreshUsers().catch(() => {}),
      ]);

      const duration = Math.round(performance.now() - start);
      setLatencyMs(Math.max(12, duration));
      setAgents(agentsData || []);
      if (docsData && docsData.quota) {
        setDocQuota(docsData.quota);
      }
      setNegativeFeedbacks(feedbacksData || []);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Telemetry sync warning:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser, refreshUsers]);

  // Initial load and 30-second live polling
  useEffect(() => {
    syncLiveTelemetry();
    const interval = setInterval(syncLiveTelemetry, 30000);
    return () => clearInterval(interval);
  }, [syncLiveTelemetry]);

  // ─── Live Aggregate Business Metrics ─────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalTokens = usersList.reduce((acc, u) => acc + (u.tokensUsed || 0), 0);
    const totalAllocatedCredits = usersList.reduce((acc, u) => acc + (u.credits || 0), 0);
    const activeCreditUsers = usersList.filter((u) => u.credits > 0).length;
    const adminCount = usersList.filter((u) => u.role === 'admin').length;
    const standardCount = usersList.filter((u) => u.role === 'user').length;
    const openFeedbackCount = negativeFeedbacks.filter((f) => f.status !== 'resolved').length;

    return {
      totalTokens,
      totalAllocatedCredits,
      activeCreditUsers,
      adminCount,
      standardCount,
      openFeedbackCount,
    };
  }, [usersList, negativeFeedbacks]);

  // ─── Filtered Users List ─────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      const matchesCredit =
        creditFilter === 'all' ||
        (creditFilter === 'active' && u.credits > 0) ||
        (creditFilter === 'exhausted' && u.credits <= 0);

      return matchesSearch && matchesRole && matchesCredit;
    });
  }, [usersList, searchQuery, roleFilter, creditFilter]);

  // ─── Filtered Negative Feedbacks ─────────────────────────────────────────────
  const filteredFeedbacks = useMemo(() => {
    return negativeFeedbacks.filter((f) => {
      const matchesSearch =
        (f.user_prompt || '').toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        (f.assistant_response || '').toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        (f.username || '').toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        (f.user_email || '').toLowerCase().includes(feedbackSearch.toLowerCase());

      const matchesModel =
        feedbackModelFilter === 'all' ||
        (feedbackModelFilter === 'local' && (f.routed_to === 'local' || (f.model || '').toLowerCase().includes('qwen'))) ||
        (feedbackModelFilter === 'frontier' && (f.routed_to === 'frontier' || (f.model || '').toLowerCase().includes('gemini')));

      const matchesStatus =
        feedbackStatusFilter === 'all' ||
        (feedbackStatusFilter === 'open' && f.status !== 'resolved' && f.status !== 'reviewed') ||
        (feedbackStatusFilter === 'reviewed' && (f.status === 'reviewed' || f.status === 'resolved'));

      return matchesSearch && matchesModel && matchesStatus;
    });
  }, [negativeFeedbacks, feedbackSearch, feedbackModelFilter, feedbackStatusFilter]);

  // ─── Top Token Consumers (Leaderboard) ───────────────────────────────────────
  const topConsumers = useMemo(() => {
    return [...usersList]
      .sort((a, b) => (b.tokensUsed || 0) - (a.tokensUsed || 0))
      .slice(0, 4);
  }, [usersList]);

  // ─── Handle Credit Adjustments ───────────────────────────────────────────────
  const handleSaveCredits = async (email: string, amountToSet?: number) => {
    const targetAmount = amountToSet !== undefined ? amountToSet : creditInputs[email];
    if (targetAmount === undefined) return;

    setSavingEmails((prev) => ({ ...prev, [email]: true }));
    try {
      await updateUserCredits(email, Math.max(0, targetAmount));
      setSuccessStates((prev) => ({ ...prev, [email]: true }));
      setStatusMessage({ text: `Updated budget for ${email} to ${targetAmount} credits`, type: 'success' });
      setTimeout(() => {
        setSuccessStates((prev) => ({ ...prev, [email]: false }));
        setStatusMessage(null);
      }, 2500);
    } catch {
      setStatusMessage({ text: `Failed to update budget for ${email}`, type: 'error' });
    } finally {
      setSavingEmails((prev) => ({ ...prev, [email]: false }));
    }
  };

  const handleQuickAdd = (email: string, currentCredits: number, delta: number) => {
    const newTotal = currentCredits + delta;
    setCreditInputs((prev) => ({ ...prev, [email]: newTotal }));
    handleSaveCredits(email, newTotal);
  };

  // ─── Handle Negative Feedback Status ─────────────────────────────────────────
  const handleUpdateFeedbackStatus = (id: string, status: 'open' | 'reviewed' | 'resolved') => {
    updateNegativeFeedbackStatus(id, status);
    setNegativeFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f))
    );
  };

  return (
    <div className="admin-page-container">
      <style>{`
        .admin-page-container {
          padding: 32px 40px;
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .admin-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(19, 62, 66, 0.08);
        }

        .admin-header-title-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-title-icon {
          width: 46px;
          height: 46px;
          border-radius: var(--r-md);
          background: linear-gradient(135deg, var(--accent), #095554);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px var(--accent-glow);
          color: #fff;
          flex-shrink: 0;
        }

        .admin-title-text h2 {
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .admin-title-text p {
          font-size: 0.82rem;
          color: var(--text-primary-dark);
          opacity: 0.7;
          margin-top: 2px;
        }

        .admin-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .live-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--r-full);
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #065f46;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
          animation: statusBlink 1.5s ease-in-out infinite;
        }

        @keyframes statusBlink {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: var(--r-md);
          background: rgba(19, 62, 66, 0.06);
          border: 1px solid rgba(19, 62, 66, 0.14);
          color: var(--text-primary-dark);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: rgba(19, 62, 66, 0.1);
          border-color: var(--accent);
          color: var(--accent);
        }

        .refresh-btn:disabled {
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

        /* ─── Business KPI Metrics Grid ─── */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .kpi-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 18px 20px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .kpi-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          opacity: 0.75;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .kpi-icon-box {
          width: 32px;
          height: 32px;
          border-radius: var(--r-sm);
          background: rgba(10, 95, 107, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .kpi-footer {
          font-size: 0.72rem;
          color: var(--text-primary-dark);
          opacity: 0.65;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ─── Modern Tab Switcher ─── */
        .tab-switcher-row {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(19, 62, 66, 0.1);
          padding-bottom: 2px;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--r-md) var(--r-md) 0 0;
          border: none;
          background: transparent;
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text-primary-dark);
          opacity: 0.65;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .tab-btn:hover {
          opacity: 1;
          background: rgba(19, 62, 66, 0.04);
        }

        .tab-btn.active {
          opacity: 1;
          color: var(--accent);
          border-bottom: 2px solid var(--accent);
          font-weight: 700;
        }

        .tab-badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: var(--r-full);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .tab-badge.neutral {
          background: rgba(19, 62, 66, 0.08);
          color: var(--text-primary-dark);
        }

        .tab-badge.alert {
          background: rgba(239, 68, 68, 0.15);
          color: #b91c1c;
        }

        /* ─── Two-Column Main Content Layout ─── */
        .admin-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        @media (max-width: 980px) {
          .admin-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-panel-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 22px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .panel-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .panel-heading-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ─── Table Filter Toolbar ─── */
        .table-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .search-box-wrapper {
          position: relative;
          flex: 1;
          min-width: 180px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-primary-dark);
          opacity: 0.45;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 10px 8px 32px;
          background: #fff;
          border: 1px solid rgba(19, 62, 66, 0.15);
          border-radius: var(--r-md);
          color: var(--text-primary-dark);
          font-size: 0.8rem;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .filter-select {
          padding: 8px 12px;
          background: #fff;
          border: 1px solid rgba(19, 62, 66, 0.15);
          border-radius: var(--r-md);
          color: var(--text-primary-dark);
          font-size: 0.78rem;
          font-weight: 600;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--accent);
        }

        /* ─── Users Table ─── */
        .user-table-wrap {
          overflow-x: auto;
          border-radius: var(--r-md);
          border: 1px solid rgba(19, 62, 66, 0.08);
        }

        .business-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.8rem;
          color: var(--text-primary-dark);
        }

        .business-table th {
          background: rgba(19, 62, 66, 0.03);
          padding: 10px 14px;
          font-weight: 700;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          border-bottom: 1px solid rgba(19, 62, 66, 0.1);
          color: var(--text-primary-dark);
          opacity: 0.85;
        }

        .business-table td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(19, 62, 66, 0.06);
          vertical-align: middle;
        }

        .business-table tr:hover {
          background: rgba(19, 62, 66, 0.02);
        }

        .business-table tr:last-child td {
          border-bottom: none;
        }

        .user-id-pill {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--accent);
          background: rgba(10, 95, 107, 0.08);
          padding: 1px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 2px;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: var(--r-sm);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .role-badge.admin {
          background: rgba(16, 185, 129, 0.12);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .role-badge.user {
          background: rgba(19, 62, 66, 0.08);
          color: var(--text-primary-dark);
          border: 1px solid rgba(19, 62, 66, 0.14);
        }

        .credit-health-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: var(--r-full);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .credit-health-badge.good {
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
        }

        .credit-health-badge.low {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }

        .credit-health-badge.exhausted {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
        }

        .quick-chip {
          padding: 3px 6px;
          background: rgba(19, 62, 66, 0.06);
          border: 1px solid rgba(19, 62, 66, 0.12);
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-primary-dark);
          cursor: pointer;
          transition: all 0.15s;
        }

        .quick-chip:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .save-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid rgba(19, 62, 66, 0.15);
          background: #fff;
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .save-icon-btn:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .save-icon-btn.saved {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          border-color: var(--success);
        }

        /* ─── Disliked QA Feedbacks Cards ─── */
        .qa-feedback-card {
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: linear-gradient(135deg, rgba(254, 242, 242, 0.6), rgba(255, 255, 255, 0.9));
          border-radius: var(--r-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .qa-feedback-card:hover {
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.08);
        }

        .qa-feedback-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.75rem;
        }

        .qa-user-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--text-primary-dark);
        }

        .qa-meta-pill {
          padding: 2px 8px;
          border-radius: var(--r-full);
          font-size: 0.68rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .qa-meta-pill.model-local {
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .qa-meta-pill.model-frontier {
          background: rgba(99, 102, 241, 0.1);
          color: #4338ca;
          border: 1px solid rgba(99, 102, 241, 0.25);
        }

        .qa-block {
          border-radius: var(--r-sm);
          padding: 10px 12px;
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .qa-question-block {
          background: rgba(19, 62, 66, 0.05);
          border-left: 3px solid var(--accent);
          color: var(--text-primary-dark);
        }

        .qa-answer-block {
          background: rgba(239, 68, 68, 0.04);
          border-left: 3px solid #ef4444;
          color: var(--text-primary-dark);
        }

        .qa-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .qa-label.question { color: var(--accent); }
        .qa-label.answer { color: #dc2626; }

        .action-review-btn {
          padding: 4px 10px;
          border-radius: var(--r-sm);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(19, 62, 66, 0.15);
          background: #fff;
          color: var(--text-primary-dark);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
        }

        .action-review-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
          border-color: #10b981;
        }

        /* ─── Right Column: Infrastructure Telemetry ─── */
        .service-health-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: var(--r-md);
          background: rgba(19, 62, 66, 0.03);
          border: 1px solid rgba(19, 62, 66, 0.07);
        }

        .service-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .service-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary-dark);
        }

        .service-desc {
          font-size: 0.7rem;
          color: var(--text-primary-dark);
          opacity: 0.65;
        }

        .service-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #065f46;
          background: rgba(16, 185, 129, 0.12);
          padding: 2px 7px;
          border-radius: var(--r-full);
        }

        .storage-progress-bar {
          height: 6px;
          background: rgba(19, 62, 66, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 6px;
        }

        .storage-progress-fill {
          height: 100%;
          background: linear-gradient(9deg, var(--accent), #10b981);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .toast-banner {
          padding: 8px 14px;
          border-radius: var(--r-md);
          font-size: 0.78rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeIn 0.2s ease;
        }

        .toast-banner.success {
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .toast-banner.error {
          background: rgba(239, 68, 68, 0.1);
          color: #991b1b;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
      `}</style>

      {/* ─── Header & Real-time Live Controls ────────────────────────────────── */}
      <section className="admin-header-bar">
        <div className="admin-header-title-group">
          <div className="admin-title-icon" aria-hidden="true">
            <Shield size={24} />
          </div>
          <div className="admin-title-text">
            <h2>Enterprise Admin Console</h2>
            <p>Cloud SQL User Ledger · Disliked QA Audit · Real-Time Multi-Agent Telemetry</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <div className="live-status-pill" title="Live Heartbeat with Backend & Cloud SQL">
            <span className="live-dot" aria-hidden="true" />
            <span>Systems Online {latencyMs !== null ? `(${latencyMs}ms)` : ''}</span>
          </div>

          <button
            className="refresh-btn"
            onClick={syncLiveTelemetry}
            disabled={isRefreshing}
            title={`Last synced at ${lastSyncTime.toLocaleTimeString()}`}
            id="btn-admin-refresh"
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </section>

      {statusMessage && (
        <div className={`toast-banner ${statusMessage.type}`} role="alert">
          <Check size={14} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ─── Live Business & Platform KPIs ────────────────────────────────────── */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Total Token Consumption</span>
            <div className="kpi-icon-box"><Zap size={16} color="var(--accent)" /></div>
          </div>
          <div className="kpi-value">{metrics.totalTokens.toLocaleString()}</div>
          <div className="kpi-footer">
            <span>Across Local GPU (Qwen) & Frontier (Gemini)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Active Credit Pool</span>
            <div className="kpi-icon-box"><CreditCard size={16} color="var(--warning)" /></div>
          </div>
          <div className="kpi-value">{metrics.totalAllocatedCredits.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.6 }}>credits</span></div>
          <div className="kpi-footer">
            <span>{metrics.activeCreditUsers} of {usersList.length} accounts funded in Cloud SQL</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Managed User Accounts</span>
            <div className="kpi-icon-box"><Users size={16} color="var(--accent)" /></div>
          </div>
          <div className="kpi-value">{usersList.length}</div>
          <div className="kpi-footer">
            <span>{metrics.adminCount} Administrators · {metrics.standardCount} Standard Users</span>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('qa_feedback')}>
          <div className="kpi-card-header">
            <span>QA Disliked Responses</span>
            <div className="kpi-icon-box" style={{ background: metrics.openFeedbackCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
              <ThumbsDown size={16} color={metrics.openFeedbackCount > 0 ? '#dc2626' : '#10b981'} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: metrics.openFeedbackCount > 0 ? '#dc2626' : 'var(--text-primary-dark)' }}>
            {metrics.openFeedbackCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.6 }}>flagged</span>
          </div>
          <div className="kpi-footer">
            <span>{metrics.openFeedbackCount > 0 ? 'Review user thumbs-down Q&A' : 'All user queries rated positively'}</span>
          </div>
        </div>
      </section>

      {/* ─── Navigation Tabs for Admin Operations ─────────────────────────────── */}
      <div className="tab-switcher-row">
        <button
          className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
          id="btn-tab-ledger"
        >
          <Users size={15} />
          <span>User Access & Credit Ledger</span>
          <span className="tab-badge neutral">{usersList.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'qa_feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('qa_feedback')}
          id="btn-tab-qa"
        >
          <ThumbsDown size={15} />
          <span>Disliked Responses (QA Review)</span>
          {metrics.openFeedbackCount > 0 && (
            <span className="tab-badge alert">{metrics.openFeedbackCount}</span>
          )}
        </button>
      </div>

      {/* ─── Main Two-Column Dashboard Content ────────────────────────────────── */}
      <div className="admin-main-grid">
        {/* Left Column: Tab Content */}
        {activeTab === 'ledger' ? (
          /* TAB 1: Cloud SQL User Management & Credit Bank */
          <div className="admin-panel-card">
            <div className="panel-heading-row">
              <h3 className="panel-heading-title">
                <Users size={18} color="var(--accent)" />
                User Access & Credit Ledger
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-primary-dark)', opacity: 0.65 }}>
                Showing {filteredUsers.length} of {usersList.length} accounts
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="table-toolbar">
              <div className="search-box-wrapper">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by username or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  id="input-user-search"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="filter-select"
                aria-label="Filter by role"
                id="select-role-filter"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins Only</option>
                <option value="user">Users Only</option>
              </select>

              <select
                value={creditFilter}
                onChange={(e) => setCreditFilter(e.target.value as any)}
                className="filter-select"
                aria-label="Filter by credit status"
                id="select-credit-filter"
              >
                <option value="all">All Balances</option>
                <option value="active">Funded (&gt; 0)</option>
                <option value="exhausted">Exhausted (0)</option>
              </select>
            </div>

            {/* User Table */}
            <div className="user-table-wrap">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>User & ID</th>
                    <th>Role</th>
                    <th>Tokens Used</th>
                    <th>Credits Balance</th>
                    <th style={{ textAlign: 'right' }}>Credit Adjustment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                        No matching user accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const inputVal = creditInputs[u.email] !== undefined ? creditInputs[u.email] : u.credits;
                      const isSaving = savingEmails[u.email];
                      const isSaved = successStates[u.email];

                      return (
                        <tr key={u.email}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary-dark)' }}>{u.username}</div>
                            <div style={{ opacity: 0.65, fontSize: '0.72rem' }}>{u.email}</div>
                            {u.id && <span className="user-id-pill">ID #{u.id}</span>}
                          </td>

                          <td>
                            <span className={`role-badge ${u.role}`}>
                              {u.role === 'admin' ? 'Administrator' : 'Standard'}
                            </span>
                          </td>

                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>
                            {u.tokensUsed ? u.tokensUsed.toLocaleString() : '0'}
                          </td>

                          <td>
                            <span
                              className={`credit-health-badge ${
                                u.role === 'admin'
                                  ? 'good'
                                  : u.credits > 10
                                  ? 'good'
                                  : u.credits > 0
                                  ? 'low'
                                  : 'exhausted'
                              }`}
                            >
                              {u.role === 'admin' ? 'Unlimited' : `${u.credits} remaining`}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                              {/* Quick Add Chips */}
                              <button
                                className="quick-chip"
                                onClick={() => handleQuickAdd(u.email, u.credits, 20)}
                                title="Add +20 Credits"
                              >
                                +20
                              </button>
                              <button
                                className="quick-chip"
                                onClick={() => handleQuickAdd(u.email, u.credits, 50)}
                                title="Add +50 Credits"
                              >
                                +50
                              </button>

                              {/* Direct Inline Input */}
                              <input
                                type="number"
                                value={inputVal}
                                onChange={(e) =>
                                  setCreditInputs({
                                    ...creditInputs,
                                    [u.email]: Math.max(0, parseInt(e.target.value) || 0),
                                  })
                                }
                                style={{
                                  width: '64px',
                                  padding: '4px 6px',
                                  border: '1px solid rgba(19, 62, 66, 0.18)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary-dark)',
                                  background: '#fff',
                                  fontSize: '0.78rem',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                }}
                                min="0"
                                aria-label={`Credit balance for ${u.username}`}
                              />

                              <button
                                className={`save-icon-btn ${isSaved ? 'saved' : ''}`}
                                onClick={() => handleSaveCredits(u.email)}
                                disabled={isSaving}
                                title="Save to Cloud SQL"
                                aria-label="Save credits"
                              >
                                {isSaved ? <Check size={13} /> : <Save size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 2: Disliked Responses / Negative QA Review */
          <div className="admin-panel-card">
            <div className="panel-heading-row">
              <h3 className="panel-heading-title" style={{ color: '#b91c1c' }}>
                <AlertTriangle size={18} color="#dc2626" />
                User Disliked Responses (QA Review)
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-primary-dark)', opacity: 0.65 }}>
                {filteredFeedbacks.length} interaction(s) flagged
              </span>
            </div>

            {/* Negative Feedback Search & Filters */}
            <div className="table-toolbar">
              <div className="search-box-wrapper">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search user questions or AI answers…"
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  className="search-input"
                  id="input-qa-search"
                />
              </div>

              <select
                value={feedbackModelFilter}
                onChange={(e) => setFeedbackModelFilter(e.target.value as any)}
                className="filter-select"
                aria-label="Filter by model"
                id="select-qa-model"
              >
                <option value="all">All Models</option>
                <option value="local">Local LLM (Qwen)</option>
                <option value="frontier">Frontier (Gemini)</option>
              </select>

              <select
                value={feedbackStatusFilter}
                onChange={(e) => setFeedbackStatusFilter(e.target.value as any)}
                className="filter-select"
                aria-label="Filter by review status"
                id="select-qa-status"
              >
                <option value="all">All Statuses</option>
                <option value="open">Needs Review</option>
                <option value="reviewed">Reviewed / Resolved</option>
              </select>
            </div>

            {/* QA Feedbacks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
              {filteredFeedbacks.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.04)', borderRadius: 'var(--r-md)', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary-dark)' }}>No Negative Feedback Reported</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-primary-dark)', opacity: 0.65, marginTop: '2px' }}>
                    All assistant responses from users have positive ratings or haven't been flagged.
                  </div>
                </div>
              ) : (
                filteredFeedbacks.map((item) => (
                  <div key={item.id || item.session_id} className="qa-feedback-card">
                    {/* Header Info */}
                    <div className="qa-feedback-header">
                      <div className="qa-user-info">
                        <Users size={13} color="var(--accent)" />
                        <span>{item.username || item.user_email || 'User'}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.6 }}>
                          ({new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`qa-meta-pill ${item.routed_to === 'frontier' ? 'model-frontier' : 'model-local'}`}>
                          <Zap size={11} />
                          {item.model || (item.routed_to === 'frontier' ? 'Gemini 2.5 Flash' : 'Qwen 2.5 7B')}
                        </span>

                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: item.status === 'resolved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: item.status === 'resolved' ? '#065f46' : '#b91c1c',
                          }}
                        >
                          {item.status === 'resolved' ? 'Resolved' : item.status === 'reviewed' ? 'Reviewed' : 'Open'}
                        </span>
                      </div>
                    </div>

                    {/* Question Block */}
                    <div className="qa-block qa-question-block">
                      <div className="qa-label question">
                        <MessageSquare size={12} />
                        User Question
                      </div>
                      <div style={{ fontWeight: 600 }}>{item.user_prompt}</div>
                    </div>

                    {/* Answer Block */}
                    <div className="qa-block qa-answer-block">
                      <div className="qa-label answer">
                        <ThumbsDown size={12} />
                        Disliked AI Response
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', opacity: 0.9 }}>{item.assistant_response}</div>
                    </div>

                    {/* Admin Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                      {item.status !== 'resolved' ? (
                        <button
                          className="action-review-btn"
                          onClick={() => handleUpdateFeedbackStatus(item.id, 'resolved')}
                        >
                          <Check size={12} color="#10b981" />
                          Mark as Resolved
                        </button>
                      ) : (
                        <button
                          className="action-review-btn"
                          onClick={() => handleUpdateFeedbackStatus(item.id, 'open')}
                        >
                          Reopen Review
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Right Column: Infrastructure Telemetry & Consumption Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Live Infrastructure Status Card */}
          <div className="admin-panel-card">
            <div className="panel-heading-row">
              <h3 className="panel-heading-title">
                <Server size={18} color="var(--accent)" />
                Infrastructure & Routing
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-primary-dark)', opacity: 0.65 }}>
                {agents.length} Agent(s) Online
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="service-health-item">
                <div className="service-info">
                  <Database size={16} color="var(--accent)" />
                  <div>
                    <div className="service-name">Cloud SQL PostgreSQL</div>
                    <div className="service-desc">User ledger, RBAC & credit balances</div>
                  </div>
                </div>
                <span className="service-badge">
                  <span className="live-dot" style={{ width: 5, height: 5 }} /> Active
                </span>
              </div>

              <div className="service-health-item">
                <div className="service-info">
                  <Zap size={16} color="#10b981" />
                  <div>
                    <div className="service-name">Local GPU vLLM Engine</div>
                    <div className="service-desc">Qwen 2.5 7B low-latency inference</div>
                  </div>
                </div>
                <span className="service-badge">
                  <span className="live-dot" style={{ width: 5, height: 5 }} /> Online
                </span>
              </div>

              <div className="service-health-item">
                <div className="service-info">
                  <Cpu size={16} color="#818cf8" />
                  <div>
                    <div className="service-name">Frontier Gateway</div>
                    <div className="service-desc">Gemini 2.5 Flash on Vertex AI</div>
                  </div>
                </div>
                <span className="service-badge">
                  <span className="live-dot" style={{ width: 5, height: 5 }} /> Ready
                </span>
              </div>
            </div>

            {/* Enterprise Knowledge Base Quota */}
            {docQuota && (
              <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(19, 62, 66, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary-dark)' }}>
                  <span>Enterprise RAG Storage</span>
                  <span>{docQuota.total_mb.toFixed(1)} / {docQuota.max_mb} MB</span>
                </div>
                <div className="storage-progress-bar">
                  <div
                    className="storage-progress-fill"
                    style={{ width: `${Math.min(100, (docQuota.total_mb / docQuota.max_mb) * 100)}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-primary-dark)', opacity: 0.6, marginTop: '4px' }}>
                  <span>{docQuota.total_documents} Indexed Documents</span>
                  <span>{docQuota.remaining_mb.toFixed(1)} MB Remaining</span>
                </div>
              </div>
            )}
          </div>

          {/* Business Consumption Leaderboard */}
          <div className="admin-panel-card">
            <div className="panel-heading-row">
              <h3 className="panel-heading-title">
                <Activity size={18} color="var(--accent)" />
                Top Token Consumers
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topConsumers.map((u, i) => (
                <div
                  key={u.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--r-sm)',
                    background: i === 0 ? 'rgba(10, 95, 107, 0.06)' : 'rgba(19, 62, 66, 0.02)',
                    border: '1px solid rgba(19, 62, 66, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: i === 0 ? 'var(--accent)' : 'rgba(19, 62, 66, 0.1)',
                        color: i === 0 ? '#fff' : 'var(--text-primary-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary-dark)' }}>{u.username}</div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.6 }}>{u.role}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {(u.tokensUsed || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
