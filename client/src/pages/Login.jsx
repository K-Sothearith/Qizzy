import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.pageContainer}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Sparkles size={24} color="#6c5ce7" />
          </div>
          <h2 style={styles.title}>Welcome Back to Qizzy</h2>
          <p style={styles.subtitle}>Sign in to join live quizzes and view your score history</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              'Signing In...'
            ) : (
              <>
                <LogIn size={18} /> Log In
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <Link to="/register" style={{ fontWeight: '600' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: 'calc(100vh - 75px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px 32px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  iconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    background: 'rgba(108, 92, 231, 0.15)',
    border: '1px solid rgba(108, 92, 231, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto'
  },
  title: {
    fontSize: '1.75rem',
    marginBottom: '8px'
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.92rem'
  },
  submitBtn: {
    width: '100%',
    marginTop: '8px',
    padding: '14px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '0.95rem'
  }
};
