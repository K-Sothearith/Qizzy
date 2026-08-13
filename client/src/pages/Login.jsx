import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthFieldError from '../components/AuthFieldError';
import { LogIn, Sparkles, Eye, EyeOff } from 'lucide-react';

const REMEMBER_ME_KEY = 'qizzy_remembered_credentials';

function getRememberedCredentials() {
  const fallbackCredentials = {
    email: '',
    password: '',
    rememberMe: false
  };

  const savedCredentials = localStorage.getItem(REMEMBER_ME_KEY);

  if (!savedCredentials) return fallbackCredentials;

  try {
    const parsedCredentials = JSON.parse(savedCredentials);

    return {
      email: parsedCredentials.email || '',
      password: parsedCredentials.password || '',
      rememberMe: true
    };
  } catch {
    localStorage.removeItem(REMEMBER_ME_KEY);
    return fallbackCredentials;
  }
}

export default function Login() {
  const [rememberedCredentials] = useState(getRememberedCredentials);
  const [email, setEmail] = useState(rememberedCredentials.email);
  const [password, setPassword] = useState(rememberedCredentials.password);
  const [rememberMe, setRememberMe] = useState(rememberedCredentials.rememberMe);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function clearFieldError(fieldName) {
    setFieldErrors((currentErrors) => ({ ...currentErrors, [fieldName]: '' }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Please fill out this field.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    } else if (!password) {
      nextErrors.password = 'Please fill out this field.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await login(email.trim(), password);

      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_ME_KEY,
          JSON.stringify({
            email: email.trim(),
            password
          })
        );
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      navigate('/dashboard');
    } catch (err) {
      setFieldErrors({
        password: err.message || 'Failed to log in. Please check your credentials.'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Sparkles size={30} color="#6c5ce7" />
          </div>
          <h2 style={styles.title}>Welcome to Qizzy</h2>
          <p style={styles.subtitle}>Sign in to join live quizzes and view your scores</p>
        </div>

        <hr style={{ width: '75%', marginBottom: '15px', marginLeft: 'auto', marginRight: 'auto', border: '0.5px solid rgba(255, 255, 255, 0.08)' }} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <AuthFieldError message={fieldErrors.email} />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <AuthFieldError message={fieldErrors.password} />
          </div>

          <div className="remember-me-row">
            <label className="remember-me-control" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  setRememberMe(e.target.checked);
                  if (!e.target.checked) {
                    localStorage.removeItem(REMEMBER_ME_KEY);
                  }
                }}
              />
              <span className="remember-me-box" aria-hidden="true" />
              <span>Remember me</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              'Signing In...'
            ) : (
              <>
                <LogIn size={15} /> Log In
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
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '25px 30px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '16px'
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(108, 92, 231, 0.15)',
    border: '1px solid rgba(108, 92, 231, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 8px auto'
  },
  title: {
    fontSize: '1.45rem',
    marginBottom: '3px'
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem'
  },
  submitBtn: {
    width: '100%',
    marginTop: '6px',
    padding: '10px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '12px',
    fontSize: '0.84rem'
  }
};
