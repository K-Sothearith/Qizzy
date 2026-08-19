import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchHostHistory } from '../services/analyticsService';
import { 
  ArrowLeft, 
  History, 
  Trophy, 
  Users, 
  Calendar, 
  Gamepad2, 
  RefreshCw, 
  ChevronRight, 
  X, 
  Award,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function HostHistory() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // "See More" Full Standings Modal State
  const [selectedSession, setSelectedSession] = useState(null);

  const loadData = async () => {
    try {
      if (!token) return;
      setError('');
      const data = await fetchHostHistory(token);
      setHistory(data?.history || []);
    } catch (err) {
      console.error('Error fetching host quiz history:', err);
      setError(err.message || 'Failed to load hosting history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openModal = (session) => {
    setSelectedSession(session);
  };

  const closeModal = () => {
    setSelectedSession(null);
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { label: '🥇 1st', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)', border: '1px solid rgba(251, 191, 36, 0.45)' };
    if (rank === 2) return { label: '🥈 2nd', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.45)' };
    if (rank === 3) return { label: '🥉 3rd', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.18)', border: '1px solid rgba(251, 146, 60, 0.45)' };
    return { label: `#${rank}`, color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-glass)' };
  };

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <div style={styles.topNavRow}>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-secondary" 
          style={styles.backBtn}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="btn btn-glass" 
          style={styles.refreshBtn}
          title="Refresh History"
        >
          <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="glass-panel" style={styles.heroBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.heroIconWrap}>
            <History size={26} color="var(--secondary)" />
          </div>
          <div>
            <h1 style={styles.heroTitle}>Quiz Hosting History</h1>
            <p style={styles.heroSubtitle}>
              Review student leaderboards and scores from your 5 most recent live sessions.
            </p>
          </div>
        </div>

        <div className="badge badge-admin" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          Retaining 5 Recent Quizzes
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RefreshCw size={32} className="spin-icon" style={{ margin: '0 auto 16px', color: 'var(--secondary)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Loading hosted quiz sessions...</p>
        </div>
      ) : history.length === 0 ? (
        /* Empty State */
        <div className="glass-card" style={styles.emptyState}>
          <div style={styles.emptyIconCircle}>
            <Gamepad2 size={40} color="var(--secondary)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>No Hosted Quizzes Found</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '460px', marginBottom: '24px', lineHeight: 1.5 }}>
            When you host and complete a live quiz session from your Teacher Workspace, student scores and leaderboards will automatically appear here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Go to Quizzes
          </button>
        </div>
      ) : (
        /* 5 Quiz Records List */
        <div style={styles.sessionList}>
          {history.map((session, index) => (
            <div key={session.sessionId} className="glass-panel" style={styles.sessionCard}>
              {/* Session Header / Identity */}
              <div style={styles.sessionCardHeader}>
                <div style={styles.sessionIdentityLeft}>
                  <div style={styles.coverThumbnail}>
                    {session.quizCover ? (
                      <img src={session.quizCover} alt={session.quizTitle} style={styles.coverImg} />
                    ) : (
                      <div style={styles.coverPlaceholder}>
                        <Gamepad2 size={22} color="var(--secondary)" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={styles.sessionTitle}>{session.quizTitle}</h2>
                      <span className="badge badge-student" style={{ fontSize: '0.78rem' }}>
                        PIN: {session.pinCode}
                      </span>
                    </div>

                    <div style={styles.sessionMetaRow}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        {new Date(session.date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} at {new Date(session.date).toLocaleTimeString(undefined, { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} color="var(--text-muted)" />
                        <strong>{session.totalPlayers}</strong> {session.totalPlayers === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => openModal(session)} 
                  className="btn btn-glass"
                  style={styles.seeMoreBtn}
                >
                  <span>See More ({session.totalPlayers})</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Top 5 Leaderboard Preview */}
              <div style={styles.previewSection}>
                <div style={styles.previewHeader}>
                  <span style={styles.previewTitle}>
                    <Trophy size={15} color="#ffd32a" /> Top 5 Leaderboard
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Showing top {Math.min(session.top5.length, 5)} of {session.totalPlayers}
                  </span>
                </div>

                {session.top5.length === 0 ? (
                  <div style={styles.noPlayersMessage}>
                    No student scores recorded for this session.
                  </div>
                ) : (
                  <div style={styles.leaderboardTable}>
                    {session.top5.map((player) => {
                      const badge = getRankBadge(player.rank);
                      return (
                        <div key={player.userId || player.rank} style={styles.leaderboardRow}>
                          <div style={styles.playerRankSide}>
                            <span 
                              style={{
                                ...styles.rankPill,
                                color: badge.color,
                                background: badge.bg,
                                border: badge.border
                              }}
                            >
                              {badge.label}
                            </span>
                            
                            <div style={styles.playerNames}>
                              <strong style={styles.realName}>{player.realName || 'Guest Student'}</strong>
                              <span style={styles.username}>@{player.username || 'student'}</span>
                            </div>
                          </div>

                          <div style={styles.playerScore}>
                            <strong>{player.score.toLocaleString()}</strong>
                            <span style={styles.scoreUnit}>pts</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Leaderboard Modal ("See More") */}
      {selectedSession && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div className="glass-panel" style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Trophy size={20} color="#ffd32a" />
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Complete Leaderboard</h2>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  {selectedSession.quizTitle} • PIN: <strong>{selectedSession.pinCode}</strong> • {selectedSession.totalPlayers} Total Students
                </p>
              </div>
              <button onClick={closeModal} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {selectedSession.allPlayers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No participants logged for this session.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedSession.allPlayers.map((player) => {
                    const badge = getRankBadge(player.rank);
                    return (
                      <div key={player.userId || player.rank} className="glass-card" style={styles.modalPlayerRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span 
                            style={{
                              ...styles.rankPill,
                              color: badge.color,
                              background: badge.bg,
                              border: badge.border
                            }}
                          >
                            {badge.label}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
                              {player.realName || 'Guest Student'}
                            </strong>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              @{player.username || 'student'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-light)' }}>
                            {player.score.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1080px',
    margin: '0 auto',
    padding: '28px 20px 60px'
  },
  topNavRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  backBtn: {
    padding: '8px 14px',
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  refreshBtn: {
    padding: '6px 14px',
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  heroBanner: {
    padding: '22px 28px',
    marginBottom: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    background: 'linear-gradient(135deg, rgba(39, 55, 77, 0.95) 0%, rgba(82, 109, 130, 0.45) 100%)',
    border: '1px solid rgba(157, 178, 191, 0.3)'
  },
  heroIconWrap: {
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    background: 'rgba(82, 109, 130, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  heroTitle: {
    fontSize: '1.65rem',
    fontWeight: 800,
    letterSpacing: '-0.3px',
    marginBottom: '4px'
  },
  heroSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.92rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '50px 20px',
    borderRadius: '16px'
  },
  emptyIconCircle: {
    width: '74px',
    height: '74px',
    borderRadius: '50%',
    background: 'rgba(157, 178, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sessionCard: {
    padding: '24px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  sessionCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-glass)'
  },
  sessionIdentityLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: '1 1 320px'
  },
  coverThumbnail: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    overflow: 'hidden',
    flexShrink: 0
  },
  coverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'rgba(132, 129, 122, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sessionTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-main)'
  },
  sessionMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    flexWrap: 'wrap'
  },
  seeMoreBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  previewTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--text-muted)'
  },
  noPlayersMessage: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px'
  },
  leaderboardTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(132, 129, 122, 0.14)',
    borderRadius: '10px',
    border: '1px solid var(--border-glass)'
  },
  playerRankSide: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  rankPill: {
    padding: '3px 9px',
    borderRadius: '16px',
    fontSize: '0.76rem',
    fontWeight: 800,
    letterSpacing: '0.4px',
    minWidth: '44px',
    textAlign: 'center'
  },
  playerNames: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    flexWrap: 'wrap'
  },
  realName: {
    fontSize: '0.94rem',
    fontWeight: 700,
    color: 'var(--text-main)'
  },
  username: {
    fontSize: '0.82rem',
    color: 'var(--secondary)'
  },
  playerScore: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--accent-light)'
  },
  scoreUnit: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(25, 24, 22, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '580px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 0
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-glass)'
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px'
  },
  modalBody: {
    padding: '18px 24px',
    overflowY: 'auto',
    flex: 1
  },
  modalPlayerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '10px'
  }
};
