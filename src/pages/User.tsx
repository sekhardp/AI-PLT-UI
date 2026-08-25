import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Shield, Key, Database, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="user-page-container">
      <style>{`
        .user-page-container {
          padding: 40px;
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 28px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .user-header-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .user-large-avatar {
          width: 64px;
          height: 64px;
          border-radius: var(--r-lg);
          background: linear-gradient(135deg, var(--accent-dim), var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px var(--accent-glow);
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .user-title-block h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary-dark);
        }

        .user-title-block p {
          font-size: 0.85rem;
          color: var(--text-primary-dark);
          opacity: 0.7;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .profile-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-lg);
          padding: 24px;
          color: #133e42;
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
          gap: 12px;
          font-size: 0.85rem;
          color: var(--text-primary-dark);
        }

        .info-label {
          font-weight: 600;
          width: 100px;
          opacity: 0.85;
        }

        .info-value {
          font-family: var(--font-sans);
          opacity: 0.95;
        }

        .info-badge {
          display: inline-block;
          padding: 2px 8px;
          background: rgba(19, 62, 66, 0.08);
          border-radius: var(--r-sm);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .action-button {
          padding: 10px 16px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--r-md);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s, transform 0.15s;
          margin-top: 10px;
          box-shadow: 0 4px 10px var(--accent-glow);
        }

        .action-button:hover {
          background: var(--accent-dim);
          transform: translateY(-1px);
        }

        .action-button:active {
          transform: translateY(0);
        }

        .secondary-button {
          background: transparent;
          color: var(--text-primary-dark);
          border: 1px solid rgba(19, 62, 66, 0.2);
          box-shadow: none;
        }

        .secondary-button:hover {
          background: rgba(19, 62, 66, 0.04);
        }
      `}</style>

      <section className="user-header-section">
        <div className="user-large-avatar" aria-hidden="true">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="user-title-block">
          <h2>User Profile</h2>
          <p>Manage your account settings and local orchestration status</p>
        </div>
      </section>

      <div className="profile-grid">
        {/* Account Details Card */}
        <div className="profile-card">
          <h3 className="card-title">
            <UserIcon size={16} /> Account Details
          </h3>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className="info-value">
                <span className="info-badge">{user.role}</span>
              </span>
            </div>
            <hr style={{ border: '0', borderTop: '1px solid rgba(19, 62, 66, 0.08)', margin: '4px 0' }} />
            <div className="info-row">
              <span className="info-label">Credits</span>
              <span className="info-value" style={{ fontWeight: 600 }}>
                {user.role === 'admin' ? 'Unlimited (Admin Bypass)' : `${user.credits} Credits`}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Token Usage</span>
              <span className="info-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                {user.tokensUsed.toLocaleString()} Tokens
              </span>
            </div>
          </div>
        </div>

        {/* System Settings Card */}
        <div className="profile-card">
          <h3 className="card-title">
            <Database size={16} /> Orchestration Config
          </h3>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">LLM Provider</span>
              <span className="info-value">Local LLM (Vite Dev Server)</span>
            </div>
            <div className="info-row">
              <span className="info-label">API Endpoints</span>
              <span className="info-value">Active (Port 8000)</span>
            </div>
            <div className="info-row">
              <span className="info-label">Max Token size</span>
              <span className="info-value">4096 Tokens</span>
            </div>
          </div>
        </div>

        {/* Security / Action Card */}
        <div className="profile-card" style={{ gridColumn: 'span 1' }}>
          <h3 className="card-title">
            <Key size={16} /> System Identity
          </h3>
          <div className="info-list">
            <div className="info-row" style={{ alignItems: 'flex-start' }}>
              <span className="info-label">GCP Identity</span>
              <span className="info-value" style={{ fontSize: '0.78rem', wordBreak: 'break-all', opacity: 0.8 }}>
                gc-identity-platform://gcip-provider-local-demo-project-34a9b
              </span>
            </div>
          </div>
          <button className="action-button secondary-button" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh session
          </button>
        </div>

        {/* Danger/Session Actions Card */}
        <div className="profile-card">
          <h3 className="card-title" style={{ color: 'var(--danger)' }}>
            <Shield size={16} color="var(--danger)" /> Access Actions
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-primary-dark)', opacity: 0.8 }}>
            End your orchestration workspace session. This will clear local authentication caches.
          </p>
          <button className="action-button" style={{ background: 'var(--danger)', boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)' }} onClick={handleLogout}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
