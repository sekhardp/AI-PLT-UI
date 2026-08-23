import React, { useState } from 'react';
import { Shield, Users, Activity, Clock, Settings, Save, Server, Play } from 'lucide-react';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
}

export function AdminPage() {
  const [optimizer, setOptimizer] = useState('agentic');
  const [logLevel, setLogLevel] = useState('info');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [users, setUsers] = useState<MockUser[]>([
    { id: '1', name: 'Admin Manager', email: 'admin@example.com', role: 'admin', status: 'active' },
    { id: '2', name: 'Sarath', email: 'sarath@example.com', role: 'user', status: 'active' },
    { id: '3', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'user', status: 'active' },
    { id: '4', name: 'Robert Chen', email: 'robert.chen@example.com', role: 'user', status: 'inactive' },
  ]);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('');
    setTimeout(() => {
      setSaving(false);
      setSaveStatus('Configuration saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    }, 1000);
  };

  const handleToggleUserStatus = (id: string) => {
    setUsers(prev =>
      prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u)
    );
  };

  return (
    <div className="admin-page-container">
      <style>{`
        .admin-page-container {
          padding: 40px;
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 28px;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }

        .admin-header-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-title-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--r-md);
          background: linear-gradient(135deg, var(--warning), var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px var(--accent-glow);
          color: #fff;
        }

        .admin-title-block h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary-dark);
        }

        .admin-title-block p {
          font-size: 0.85rem;
          color: var(--text-primary-dark);
          opacity: 0.7;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 20px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--text-primary-dark);
          opacity: 0.8;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .stat-card-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          font-family: var(--font-sans);
        }

        .stat-card-desc {
          font-size: 0.72rem;
          color: var(--text-primary-dark);
          opacity: 0.65;
        }

        .dashboard-row {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 24px;
        }

        @media (max-width: 800px) {
          .dashboard-row {
            grid-template-columns: 1fr;
          }
        }

        .admin-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(19, 62, 66, 0.08);
          padding-bottom: 12px;
        }

        .card-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .config-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-primary-dark);
        }

        .form-select, .form-input {
          padding: 10px 12px;
          background: #fff;
          border: 1px solid rgba(19, 62, 66, 0.15);
          border-radius: var(--r-md);
          color: var(--text-primary-dark);
          font-size: 0.82rem;
          width: 100%;
        }

        .form-select:focus, .form-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-primary-dark);
          cursor: pointer;
          font-weight: 600;
        }

        .admin-table-container {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.8rem;
          color: var(--text-primary-dark);
        }

        .admin-table th {
          padding: 10px 12px;
          font-weight: 600;
          border-bottom: 2px solid rgba(19, 62, 66, 0.08);
          opacity: 0.8;
        }

        .admin-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(19, 62, 66, 0.05);
        }

        .badge-role {
          display: inline-block;
          padding: 2px 6px;
          border-radius: var(--r-sm);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-role.admin {
          background: rgba(38, 95, 60, 0.1);
          color: rgb(38, 95, 60);
        }

        .badge-role.user {
          background: rgba(19, 62, 66, 0.08);
          color: var(--text-primary-dark);
        }

        .status-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 6px;
        }

        .action-icon-btn {
          background: none;
          border: none;
          color: var(--text-primary-dark);
          opacity: 0.6;
          cursor: pointer;
          padding: 4px;
          border-radius: var(--r-sm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .action-icon-btn:hover {
          opacity: 1;
          background: rgba(19, 62, 66, 0.05);
        }

        .save-btn {
          padding: 10px 16px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--r-md);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s;
          box-shadow: 0 4px 10px var(--accent-glow);
          margin-top: 6px;
        }

        .save-btn:hover:not(:disabled) {
          background: var(--accent-dim);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-toast {
          font-size: 0.78rem;
          color: var(--success);
          font-weight: 600;
        }
      `}</style>

      <section className="admin-header-section">
        <div className="admin-title-icon" aria-hidden="true">
          <Shield size={24} color="#fff" />
        </div>
        <div className="admin-title-block">
          <h2>Admin Console</h2>
          <p>System dashboard, local orchestrator telemetry, and user access lists</p>
        </div>
      </section>

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span>Orchestrator Loads</span>
            <Activity size={14} color="var(--accent)" />
          </div>
          <div className="stat-card-value">1,842</div>
          <div className="stat-card-desc">Queries parsed in the last 24h</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Avg Latency</span>
            <Clock size={14} color="var(--warning)" />
          </div>
          <div className="stat-card-value">180ms</div>
          <div className="stat-card-desc">Local LLM generation feedback loop</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Total Accounts</span>
            <Users size={14} color="var(--accent)" />
          </div>
          <div className="stat-card-value">{users.length}</div>
          <div className="stat-card-desc">{users.filter(u => u.status === 'active').length} active user sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Agent Modules</span>
            <Server size={14} color="var(--success)" />
          </div>
          <div className="stat-card-value">3 / 3</div>
          <div className="stat-card-desc">Orchestrator, AI Agent, RAG Agent active</div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* User Account Registry Card */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={16} /> User Registration Registry
            </h3>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ opacity: 0.6, fontSize: '0.72rem' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge-role ${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-dot"
                        style={{ background: u.status === 'active' ? 'var(--success)' : 'var(--danger)' }}
                      />
                      {u.status}
                    </td>
                    <td>
                      <button
                        className="action-icon-btn"
                        onClick={() => handleToggleUserStatus(u.id)}
                        title={u.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                        aria-label="Toggle user status"
                      >
                        <Play size={12} style={{ transform: u.status === 'active' ? 'rotate(90deg)' : 'none', color: u.status === 'active' ? 'var(--danger)' : 'var(--success)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Settings Configurations */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">
              <Settings size={16} /> System Orchestration Config
            </h3>
          </div>
          <form className="config-form" onSubmit={handleSaveConfig}>
            <div className="form-row">
              <label className="form-label" htmlFor="select-optimizer">
                Routing Optimization Algorithm
              </label>
              <select
                id="select-optimizer"
                className="form-select"
                value={optimizer}
                onChange={e => setOptimizer(e.target.value)}
              >
                <option value="agentic">Agentic Workflow Routing (Multi-Step)</option>
                <option value="greedy">Greedy Single-Step Routing</option>
                <option value="llm-fallback">Simple LLM Direct Fallback</option>
              </select>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="select-loglevel">
                Server Log Level
              </label>
              <select
                id="select-loglevel"
                className="form-select"
                value={logLevel}
                onChange={e => setLogLevel(e.target.value)}
              >
                <option value="debug">DEBUG (Verbose Telemetry)</option>
                <option value="info">INFO (General Metrics)</option>
                <option value="warn">WARN (Errors & Warnings Only)</option>
              </select>
            </div>

            <div className="form-row" style={{ marginTop: '8px' }}>
              <label className="checkbox-container" htmlFor="checkbox-cache">
                <input
                  id="checkbox-cache"
                  type="checkbox"
                  checked={cacheEnabled}
                  onChange={e => setCacheEnabled(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Enable RAG Semantic Cache
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="submit" className="save-btn" disabled={saving} id="btn-save-config">
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              {saveStatus && <span className="success-toast" role="status">{saveStatus}</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
