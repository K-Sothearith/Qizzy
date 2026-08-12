import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, LogOut, User, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          <Target size={28} color="#6c5ce7" />
          <span style={styles.logoText}>Qizzy</span>
        </Link>

        <div style={styles.navRight}>
          {isAuthenticated ? (
            <div style={styles.userInfo}>
              <div style={styles.userBadgeGroup}>
                <span style={styles.userName}>{user.name}</span>
                {isAdmin ? (
                  <span className="badge badge-admin">
                    <ShieldCheck size={12} /> Admin
                  </span>
                ) : (
                  <span className="badge badge-student">
                    <User size={12} /> Student
                  </span>
                )}
              </div>
              <button onClick={handleLogout} className="btn btn-secondary" style={styles.logoutBtn}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div style={styles.authBtnGroup}>
              <Link to="/login" className="btn btn-secondary">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    background: 'rgba(11, 13, 25, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.6rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ffffff 0%, #a29bfe 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userBadgeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  userName: {
    fontWeight: '600',
    fontSize: '0.95rem',
    color: '#ffffff'
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '0.9rem'
  },
  authBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }
};
