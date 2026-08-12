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
      {/* Welcome Banner */}
      <div className="glass-panel" style={styles.banner}>
        <div>
          <h1 style={styles.bannerTitle}>Welcome back, {user?.name}! 👋</h1>
          <p style={styles.bannerSubtitle}>Ready to test your knowledge and climb the leaderboard?</p>
        </div>
        <span className="badge badge-student" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          Student Account
        </span>
      </div>

      {/* Quick Stats Grid */}
      <div style={styles.statsGrid}>
        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.statIconCircle, background: 'rgba(255, 118, 117, 0.15)', color: '#ff7675' }}>
            <Trophy size={24} />
          </div>
          <div>
            <div style={styles.statLabel}>Total Score</div>
            <div style={styles.statValue}>{user?.total_score || 0} pts</div>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.statIconCircle, background: 'rgba(0, 206, 201, 0.15)', color: '#00cec9' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={styles.statLabel}>Average Score</div>
            <div style={styles.statValue}>{user?.avg_score ? user.avg_score.toFixed(1) : '0.0'} pts</div>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.statIconCircle, background: 'rgba(162, 155, 254, 0.15)', color: '#a29bfe' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={styles.statLabel}>Quizzes Played</div>
            <div style={styles.statValue}>{user?.quizzes_played || 0}</div>
          </div>
        </div>
      </div>

      {/* Join Game Card */}
      <div className="glass-panel" style={styles.joinCard}>
        <div style={styles.joinHeader}>
          <Gamepad2 size={32} color="#00cec9" />
          <h2 style={{ fontSize: '1.6rem' }}>Join a Live Quiz</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Enter the 6-digit Game PIN displayed on your teacher's screen or scan the QR Code:
        </p>

        <form onSubmit={handleJoinGame} style={styles.joinForm}>
          <input
            type="text"
            className="form-input"
            style={styles.pinInput}
            placeholder="ENTER GAME PIN"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            required
          />
          <button type="submit" className="btn btn-accent" style={styles.joinBtn}>
            <Play size={20} /> Join Game
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1050px',
    margin: '0 auto',
    padding: '36px 24px'
  },
  banner: {
    padding: '32px',
    marginBottom: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px'
  },
  bannerTitle: {
    fontSize: '2.1rem',
    marginBottom: '6px'
  },
  bannerSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '1rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '36px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  statIconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    marginTop: '2px'
  },
  joinCard: {
    padding: '40px',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '0 auto'
  },
  joinHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  joinForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '400px',
    margin: '0 auto'
  },
  pinInput: {
    fontSize: '1.6rem',
    fontWeight: '800',
    letterSpacing: '4px',
    textAlign: 'center',
    padding: '16px',
    textTransform: 'uppercase'
  },
  joinBtn: {
    padding: '16px',
    fontSize: '1.1rem'
  }
};
