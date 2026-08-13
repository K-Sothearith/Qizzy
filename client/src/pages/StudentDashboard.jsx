import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Target, Award, Play, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  function handleJoinGame(e) {
    e.preventDefault();
    if (!pin.trim()) return;
    navigate(`/join?pin=${pin.trim()}`);
  }

  return (
    <div style={styles.container}>
      {/* Compact Welcome Banner */}
      <div className="glass-panel" style={styles.banner}>
        <div>
          <h1 style={styles.bannerTitle}>Welcome back, {user?.name}! 👋</h1>
          <p style={styles.bannerSubtitle}>Ready to test your knowledge and climb the leaderboard?</p>
        </div>
        <span className="badge badge-student">
          Student Account
        </span>
      </div>

      {/* Compact Quick Stats Grid */}
      <div style={styles.statsGrid}>
        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.statIconCircle, background: 'rgba(255, 118, 117, 0.15)', color: '#ff7675' }}>
            <Trophy size={18} />
          </div>
          <div>
            <div style={styles.statLabel}>Total Score</div>
            <div style={styles.statValue}>{user?.total_score || 0} pts</div>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.statIconCircle, background: 'rgba(0, 206, 201, 0.15)', color: '#00cec9' }}>
            <Award size={18} />
          </div>
          <div>
            <div style={styles.statLabel}>Average Score</div>
            <div style={styles.statValue}>{user?.avg_score ? user.avg_score.toFixed(1) : '0.0'} pts</div>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.statIconCircle, background: 'rgba(162, 155, 254, 0.15)', color: '#a29bfe' }}>
            <Target size={18} />
          </div>
          <div>
            <div style={styles.statLabel}>Quizzes Played</div>
            <div style={styles.statValue}>{user?.quizzes_played || 0}</div>
          </div>
        </div>
      </div>

      {/* Refined & Compact Join Game Card */}
      <div className="glass-panel" style={styles.joinCard}>
        <div style={styles.joinHeader}>
          <Gamepad2 size={24} color="#00cec9" />
          <h2 style={{ fontSize: '1.25rem' }}>Join a Live Quiz</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '0.88rem' }}>
          Enter the 6-digit Game PIN displayed on your teacher's screen or scan the QR Code:
        </p>

        <form onSubmit={handleJoinGame} style={styles.joinForm}>
          <input
            type="text"
            className="form-input"
            style={styles.pinInput}
            placeholder="GAME PIN"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            required
          />
          <button type="submit" className="btn btn-accent" style={styles.joinBtn}>
            <Play size={16} /> Join Game
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '950px',
    margin: '0 auto',
    padding: '24px 20px'
  },
  banner: {
    padding: '20px 24px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px'
  },
  bannerTitle: {
    fontSize: '1.5rem',
    marginBottom: '4px'
  },
  bannerSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px'
  },
  statIconCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '1.35rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    marginTop: '1px'
  },
  joinCard: {
    padding: '28px 24px',
    textAlign: 'center',
    maxWidth: '460px',
    margin: '0 auto'
  },
  joinHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '6px'
  },
  joinForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '340px',
    margin: '0 auto'
  },
  pinInput: {
    fontSize: '1.3rem',
    fontWeight: '800',
    letterSpacing: '3px',
    textAlign: 'center',
    padding: '12px',
    textTransform: 'uppercase'
  },
  joinBtn: {
    padding: '12px',
    fontSize: '0.98rem'
  }
};
