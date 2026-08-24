import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthFieldError from '../components/AuthFieldError';
import { UserPlus, Key, UserCheck, Shield, Eye, EyeOff } from 'lucide-react';

const ALLOWED_EMAIL_DOMAINS = ['@gmail.com', '@student.cadt.edu.kh', '@outlook.com'];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
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
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Select your role to get started</p>
        </div>

        <div className="role-selector">
          <div
            className={`role-pill ${role === 'student' ? 'active-student' : ''}`}
            onClick={() => {
              setRole('student');
              setFieldErrors({});
            }}
          >
            <UserCheck size={13} style={{ display: 'inline', marginRight: '4px' }} /> Student
          </div>
          <div
            className={`role-pill ${role === 'admin' ? 'active-admin' : ''}`}
            onClick={() => {
              setRole('admin');
              setFieldErrors({});
            }}
          >
            <Shield size={13} style={{ display: 'inline', marginRight: '4px' }} /> Admin (Host)
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
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
            <AuthFieldError message={fieldErrors.name} />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
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
            <div className="hint-text">Min 6 chars: uppercase, lowercase, number & special char.</div>
          </div>

          <div className={`admin-passcode-box ${role === 'admin' ? 'show' : ''}`}>
            <div className="form-group">
              <label htmlFor="adminPasscode" style={{ color: 'var(--secondary)' }}>
                <Key size={12} style={{ display: 'inline', marginRight: '4px' }} /> Secret Admin Passcode
              </label>
              <div className="input-password-wrapper">
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
                  {showAdminPasscode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <AuthFieldError message={fieldErrors.adminPasscode} />
            </div>
          </div>

          <button
            type="submit"
            className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-accent'}`}
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              'Creating Account...'
            ) : (
              <>
                <UserPlus size={15} /> Register as {role === 'admin' ? 'Admin' : 'Student'}
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/login" style={{ fontWeight: '600' }}>
            Log In
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
    marginBottom: '14px'
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
    marginTop: '14px',
    fontSize: '0.84rem'
  }
};
