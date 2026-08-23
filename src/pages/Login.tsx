import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(emailOrUsername, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid username/email or password.');
      }
    } catch {
      setError('An error occurred during sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          background: var(--bg-base);
          position: relative;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-xl);
          padding: 40px 30px;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: 28px;
          z-index: 2;
        }

        .login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .login-brand-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--r-md);
          background: linear-gradient(135deg, var(--accent-dim), var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px var(--accent-glow);
        }

        .login-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary-dark);
        }

        .login-subtitle {
          font-size: 0.85rem;
          color: var(--text-primary-dark);
          opacity: 0.8;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-primary-dark);
          display: flex;
          justify-content: space-between;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-primary-dark);
          opacity: 0.6;
        }

        .form-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          background: #fff;
          border: 1px solid rgba(19, 62, 66, 0.15);
          border-radius: var(--r-md);
          color: var(--text-primary-dark);
          font-size: 0.88rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .password-toggle-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: var(--text-primary-dark);
          opacity: 0.6;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle-btn:hover {
          opacity: 0.9;
        }

        .error-message {
          font-size: 0.8rem;
          color: var(--danger);
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: var(--r-sm);
          padding: 10px 12px;
          text-align: center;
        }

        .login-submit-btn {
          width: 100%;
          padding: 12px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--r-md);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s, transform 0.15s;
          box-shadow: 0 4px 12px var(--accent-glow);
        }

        .login-submit-btn:hover:not(:disabled) {
          background: var(--accent-dim);
          transform: translateY(-1px);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-primary-dark);
          opacity: 0.8;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .hint-text {
          font-size: 0.7rem;
          color: var(--text-primary-dark);
          opacity: 0.6;
        }
      `}</style>

      <div className="login-card">
        <header className="login-header">
          <div className="login-brand-icon" aria-hidden="true">
            <Network size={24} color="#fff" />
          </div>
          <div>
            <h1 className="login-title">AI Platform Local LLM</h1>
            <p className="login-subtitle">Sign in to access your orchestrator workspace</p>
          </div>
        </header>

        {error && <div className="error-message" role="alert">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Username or Email
            </label>
            <div className="input-container">
              <Mail className="input-icon" size={16} />
              <input
                id="email-input"
                name="email"
                type="text"
                autoComplete="username"
                className="form-input"
                placeholder="enter your email or username..."
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                disabled={loading}
                enterKeyHint="next"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="current-password">
              Password
            </label>
            <div className="input-container">
              <Lock className="input-icon" size={16} />
              <input
                id="current-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                enterKeyHint="done"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading} id="btn-login-submit">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <footer className="login-footer">
          <div>Contact system administrator for credentials.</div>
          <div className="hint-text">
            Hint: Use <strong>admin</strong> to sign in as administrator.
          </div>
        </footer>
      </div>
    </div>
  );
}
