import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, Key, UserCheck, Shield } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [adminPasscode, setAdminPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        adminPasscode: role === 'admin' ? adminPasscode : undefined
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.pageContainer}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create your Qizzy Account</h2>
          <p style={styles.subtitle}>Select your role to get started</p>
        </div>

        {/* Role Selector Pills */}
        <div className="role-selector">
          <div
            className={`role-pill ${role === 'student' ? 'active-student' : ''}`}
            onClick={() => setRole('student')}
          >
            <UserCheck size={16} style={{ display: 'inline', marginRight: '6px' }} /> Student
          </div>
          <div
            className={`role-pill ${role === 'admin' ? 'active-admin' : ''}`}
            onClick={() => setRole('admin')}
          >
            <Shield size={16} style={{ display: 'inline', marginRight: '6px' }} /> Admin (Host)
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Sothearith Kong"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
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

          {/* Dynamic Admin Passcode Field */}
          <div className={`admin-passcode-box ${role === 'admin' ? 'show' : ''}`}>
            <div className="form-group">
              <label htmlFor="adminPasscode" style={{ color: '#a29bfe' }}>
                <Key size={14} style={{ display: 'inline', marginRight: '4px' }} /> Secret Admin Passcode
              </label>
              <input
                id="adminPasscode"
                type="password"
                className="form-input"
                style={{ borderColor: 'rgba(162, 155, 254, 0.5)' }}
                placeholder="Enter secret passcode"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                required={role === 'admin'}
              />
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
                <UserPlus size={18} /> Register as {role === 'admin' ? 'Admin' : 'Student'}
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
  pageContainer: {
    minHeight: 'calc(100vh - 75px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '36px 32px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '1.65rem',
    marginBottom: '6px'
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem'
  },
  submitBtn: {
    width: '100%',
    marginTop: '12px',
    padding: '14px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '0.95rem'
  }
};
