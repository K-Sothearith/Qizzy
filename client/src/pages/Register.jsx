import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthFieldError from '../components/AuthFieldError';
import { 
  Target, 
  Zap, 
  BarChart3, 
  Tv, 
  UserCheck, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight 
} from 'lucide-react';

const ALLOWED_EMAIL_DOMAINS = ['@gmail.com', '@student.cadt.edu.kh', '@outlook.com'];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  function clearFieldError(fieldName) {
    setFieldErrors((currentErrors) => ({ ...currentErrors, [fieldName]: '' }));
  }

  function validateEmailDomain(emailStr) {
    const lower = emailStr.toLowerCase().trim();
    return ALLOWED_EMAIL_DOMAINS.some((domain) => lower.endsWith(domain));
  }

  function validatePasswordComplexity(pwd) {
    if (pwd.length < 6) return false;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }

  function validateForm() {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = 'Please fill out this field.';
    } else if (!email.trim()) {
      nextErrors.email = 'Please fill out this field.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    } else if (!validateEmailDomain(email)) {
      nextErrors.email = 'Accepted Domains: @gmail.com, @student.cadt.edu.kh, or @outlook.com';
    } else if (!password) {
      nextErrors.password = 'Please fill out this field.';
    } else if (!validatePasswordComplexity(password)) {
      nextErrors.password = 'Password must be at least 6 characters and contain uppercase, lowercase, number, and special character.';
    } else if (role === 'admin' && !adminPasscode.trim()) {
      nextErrors.adminPasscode = 'Please fill out this field.';
    } else if (!agreeTerms) {
      nextErrors.terms = 'You must agree to the Terms of Service to continue.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        adminPasscode: role === 'admin' ? adminPasscode : undefined
      });
      navigate('/dashboard');
    } catch (err) {
      setFieldErrors({
        [role === 'admin' ? 'adminPasscode' : 'email']: err.message || 'Registration failed. Please check your details.'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-split-wrapper">
        {/* Left App Description & Value Proposition Pane */}
        <aside className="auth-feature-pane">
          <div>
            <div className="auth-brand-badge">
              <div className="auth-brand-icon">
                <Target size={24} />
              </div>
              <span className="auth-brand-title">Qizzy</span>
            </div>

            <h1 className="auth-hero-headline">
              Host <span className="highlight-word">live quizzes</span>, ignite <span className="highlight-word-accent">engagement</span>.
            </h1>

            <p className="auth-hero-desc">
              The modern, interactive real-time quiz platform built for educators and active learners. 
              Host multiplayer speed-scoring battles, keep classrooms captivated, and track performance seamlessly without subscription paywalls.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon-wrap icon-wrap-cyan">
                  <Zap size={18} />
                </div>
                <div className="auth-feature-content">
                  <h4>Speed-Weighted Real-Time Engine</h4>
                  <p>Synchronized question timers, Kahoot-style color buttons, and instant response scoring.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon-wrap icon-wrap-blue">
                  <BarChart3 size={18} />
                </div>
                <div className="auth-feature-content">
                  <h4>Student Performance Analytics</h4>
                  <p>Account-based progress tracking with total points, average quiz scores, and historical logs.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon-wrap icon-wrap-yellow">
                  <Tv size={18} />
                </div>
                <div className="auth-feature-content">
                  <h4>Teacher Projector & Room QR Join</h4>
                  <p>One-click 6-digit PIN & scannable mobile QR auto-join, live distribution charts, and podium celebrations.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-trust-footer">
            <span className="auth-trust-text">Built for educators & active learners</span>
            <div className="auth-trust-dots" title="Qizzy Multi-Role Platform">
              <span className="auth-trust-dot dot-1" />
              <span className="auth-trust-dot dot-2" />
              <span className="auth-trust-dot dot-3" />
            </div>
          </div>
        </aside>

        {/* Right Registration Form Card */}
        <main className="auth-form-card">
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#FFFFFF', marginBottom: '4px' }}>
                Create your account
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                Start your journey toward interactive real-time learning.
              </p>
            </div>

            <div className="role-selector">
              <div
                className={`role-pill ${role === 'student' ? 'active-student' : ''}`}
                onClick={() => {
                  setRole('student');
                  setFieldErrors({});
                }}
              >
                <UserCheck size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-1px' }} /> Student
              </div>
              <div
                className={`role-pill ${role === 'admin' ? 'active-admin' : ''}`}
                onClick={() => {
                  setRole('admin');
                  setFieldErrors({});
                }}
              >
                <Shield size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-1px' }} /> Admin (Teacher)
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="form-input-with-icon">
                  <span className="form-field-icon">
                    <User size={17} />
                  </span>
                  <input
                    id="name"
                    type="text"
                    className="form-input"
                    placeholder="Sothearith Kong"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                </div>
                <AuthFieldError message={fieldErrors.name} />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="form-input-with-icon">
                  <span className="form-field-icon">
                    <Mail size={17} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                </div>
                <AuthFieldError message={fieldErrors.email} />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="form-input-with-icon">
                  <span className="form-field-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••••••"
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <AuthFieldError message={fieldErrors.password} />
                <div className="hint-text" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                  Min 6 chars: uppercase, lowercase, number & special symbol.
                </div>
              </div>

              <div className={`admin-passcode-box ${role === 'admin' ? 'show' : ''}`}>
                <div className="form-group">
                  <label htmlFor="adminPasscode" style={{ color: 'var(--secondary)' }}>
                    <Key size={12} style={{ display: 'inline', marginRight: '4px' }} /> Secret Admin Passcode
                  </label>
                  <div className="form-input-with-icon">
                    <span className="form-field-icon">
                      <Key size={17} color="var(--secondary)" />
                    </span>
                    <input
                      id="adminPasscode"
                      type={showAdminPasscode ? 'text' : 'password'}
                      className="form-input"
                      style={{ borderColor: fieldErrors.adminPasscode ? 'var(--color-red)' : 'rgba(149, 204, 221, 0.4)' }}
                      placeholder="Secret passcode"
                      value={adminPasscode}
                      onChange={(e) => {
                        setAdminPasscode(e.target.value);
                        clearFieldError('adminPasscode');
                      }}
                      aria-invalid={Boolean(fieldErrors.adminPasscode)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                      tabIndex={-1}
                      aria-label="Toggle passcode visibility"
                    >
                      {showAdminPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <AuthFieldError message={fieldErrors.adminPasscode} />
                </div>
              </div>

              <div className="terms-agreement-row">
                <input
                  id="agreeTerms"
                  type="checkbox"
                  className="terms-checkbox-custom"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    clearFieldError('terms');
                  }}
                />
                <label htmlFor="agreeTerms" style={{ cursor: 'pointer' }}>
                  I agree to the <span style={{ color: '#95CCDD', textDecoration: 'underline' }}>Terms of Service</span> and <span style={{ color: '#95CCDD', textDecoration: 'underline' }}>Privacy Policy</span>.
                </label>
              </div>
              <AuthFieldError message={fieldErrors.terms} />

              <button
                type="submit"
                className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-accent'}`}
                style={{ width: '100%', padding: '12px', marginTop: '4px', fontSize: '0.95rem' }}
                disabled={loading}
              >
                {loading ? (
                  'Creating Account...'
                ) : (
                  <>
                    <span>Get Started for Free</span> <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.86rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
            <Link to="/login" style={{ fontWeight: '700', color: '#95CCDD' }}>
              Sign In
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
