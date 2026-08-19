import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudentAnalytics, fetchSessionDetails } from '../services/analyticsService';
import AvatarPickerModal, { getAvatarColorStyle } from '../components/AvatarPickerModal';
import { 
  Trophy, 
  Target, 
  Award, 
  Play, 
  Gamepad2, 
  History, 
  ChevronRight, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Flame, 
  Sparkles, 
  RefreshCw, 
  HelpCircle,
  X,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [pin, setPin] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Avatar state
  const [avatar, setAvatar] = useState(() => {
    const saved = localStorage.getItem('qizzy_player_avatar');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return { emoji: '🦊', color: 'sand' };
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Session details modal state
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      if (!token) return;
      const data = await fetchStudentAnalytics(token);
      setAnalytics(data);
      setError('');
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Could not load your latest analytics.');
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

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    navigate(`/join?pin=${pin.trim()}`);
  };

  const handleViewSessionDetails = async (session) => {
    setSelectedSession(session);
    setLoadingDetails(true);
    try {
      const details = await fetchSessionDetails(session.sessionId, token);
      setSessionDetails(details.answers || []);
    } catch (err) {
      console.error('Error loading session details:', err);
      setSessionDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedSession(null);
    setSessionDetails(null);
  };

  // Compute Rank Tier Badge
  const getTierInfo = (score = 0) => {
    if (score >= 10000) return { title: 'Grandmaster', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.2)', icon: '💎' };
    if (score >= 5000) return { title: 'Gold Quizzer', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)', icon: '🥇' };
    if (score >= 2000) return { title: 'Silver Scholar', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)', icon: '🥈' };
    return { title: 'Rookie Scout', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.18)', icon: '🥉' };
  };

  const stats = analytics?.stats || {
    totalScore: user?.total_score || 0,
    avgScore: parseFloat(user?.avg_score) || 0,
    quizzesPlayed: user?.quizzes_played || 0,
    globalRank: 1,
    totalStudents: 1,
    accuracyRate: 0,
    totalAnswers: 0,
    totalCorrect: 0,
    highestGameScore: 0
  };

  const tier = getTierInfo(stats.totalScore);
  const history = analytics?.history || [];
  const activeColorObj = getAvatarColorStyle(avatar.color);

  return (
    <div className="student-dashboard-container">
      {/* 1. Hero Welcome & Quick PIN Join */}
      <div className="glass-panel student-hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div 
            onClick={() => setShowAvatarPicker(true)}
            style={{ 
              width: '74px', 
              height: '74px', 
              borderRadius: '50%', 
              background: activeColorObj.gradient,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.3rem', 
              cursor: 'pointer',
              boxShadow: `0 0 20px ${activeColorObj.border}40`,
              border: `3px solid ${activeColorObj.border}`,
              position: 'relative',
              flexShrink: 0
            }}
            title="Click to customize your student avatar"
          >
            {avatar.emoji}
            <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--secondary)', color: '#21201e', fontSize: '0.62rem', fontWeight: 800, padding: '2px 5px', borderRadius: '6px' }}>
              EDIT
            </span>
          </div>

          <div className="student-hero-left">
            <div style={styles.tierPill}>
              <span>{tier.icon}</span>
              <span style={{ color: tier.color, fontWeight: 700, fontSize: '0.85rem' }}>{tier.title}</span>
            </div>
            <h1 className="student-hero-title">Welcome back, {user?.name}! 👋</h1>
            <p className="student-hero-subtitle">
              Global Student Rank: <strong style={{ color: 'var(--secondary)' }}>#{stats.globalRank}</strong> (out of {stats.totalStudents})
            </p>
          </div>
        </div>

        <div className="student-hero-right">
          <form onSubmit={handleJoinGame} className="student-quick-join-form">
            <div className="student-quick-join-input-wrap">
              <Gamepad2 size={20} color="var(--secondary)" style={{ marginLeft: '12px' }} />
              <input
                type="text"
                placeholder="ENTER PIN"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="student-quick-join-input"
                required
              />
            </div>
            <button type="submit" className="btn btn-accent" style={styles.quickJoinBtn}>
              <Play size={16} fill="currentColor" /> Join
            </button>
          </form>
        </div>
      </div>

      {/* 2. Key Analytics Grid */}
      <div style={styles.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Performance Analytics</h2>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="btn btn-glass" 
          style={styles.refreshBtn}
          title="Refresh Statistics"
        >
          <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="student-stats-grid">
        {/* Total Score */}
        <div className="glass-card student-stat-card">
          <div style={{ ...styles.statIconCircle, background: 'rgba(255, 71, 87, 0.15)', color: '#ff6b81' }}>
            <Trophy size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.statLabel}>Total Cumulative Score</div>
            <div style={styles.statValue}>{stats.totalScore.toLocaleString()} <span style={styles.unit}>pts</span></div>
            <div style={styles.statSubtext}>High Score: <strong>{stats.highestGameScore.toLocaleString()} pts</strong></div>
          </div>
        </div>

        {/* Accuracy Rate */}
        <div className="glass-card student-stat-card">
          <div style={{ ...styles.statIconCircle, background: 'rgba(0, 210, 211, 0.15)', color: 'var(--secondary)' }}>
            <Target size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.statLabel}>Overall Accuracy</div>
            <div style={styles.statValue}>{stats.accuracyRate}%</div>
            <div style={styles.accuracyProgressTrack}>
              <div style={{ ...styles.accuracyProgressFill, width: `${Math.min(100, stats.accuracyRate)}%` }} />
            </div>
            <div style={styles.statSubtext}>{stats.totalCorrect} correct of {stats.totalAnswers} questions</div>
          </div>
        </div>

        {/* Average Score */}
        <div className="glass-card student-stat-card">
          <div style={{ ...styles.statIconCircle, background: 'rgba(162, 155, 254, 0.15)', color: '#a29bfe' }}>
            <Award size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.statLabel}>Average Score / Quiz</div>
            <div style={styles.statValue}>{stats.avgScore.toFixed(0)} <span style={styles.unit}>pts</span></div>
            <div style={styles.statSubtext}>Consistent performance metric</div>
          </div>
        </div>

        {/* Quizzes Played */}
        <div className="glass-card student-stat-card">
          <div style={{ ...styles.statIconCircle, background: 'rgba(255, 211, 42, 0.15)', color: '#ffd32a' }}>
            <History size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.statLabel}>Quizzes Completed</div>
            <div style={styles.statValue}>{stats.quizzesPlayed}</div>
            <div style={styles.statSubtext}>Active participant in live rooms</div>
          </div>
        </div>
      </div>

      {/* 3. Session History Section */}
      <div style={{ ...styles.sectionHeader, marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={20} color="var(--secondary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Past Quiz Sessions</h2>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {history.length} {history.length === 1 ? 'session' : 'sessions'} recorded
        </span>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 12px', color: 'var(--secondary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading your session history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <div style={styles.emptyIconCircle}>
            <Gamepad2 size={36} color="var(--secondary)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Live Quizzes Played Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            When your teacher hosts a Qizzy session, enter the 6-digit Game PIN above or scan their screen QR code to earn points!
          </p>
        </div>
      ) : (
        <div className="student-history-list">
          {history.map((session) => (
            <div key={session.sessionId} className="glass-card student-history-card">
              <div className="student-history-main">
                <div style={styles.historyCoverWrap}>
                  {session.quizCover ? (
                    <img src={session.quizCover} alt={session.quizTitle} style={styles.historyCover} />
                  ) : (
                    <div style={styles.historyCoverPlaceholder}>
                      <Gamepad2 size={24} color="var(--primary)" />
                    </div>
                  )}
                </div>

                <div style={styles.historyInfo}>
                  <div style={styles.historyTitleRow}>
                    <h3 style={styles.historyTitle}>{session.quizTitle}</h3>
                    <span style={getRankBadgeStyle(session.rank)}>
                      {session.rank === 1 ? '🥇 1st Place' : session.rank === 2 ? '🥈 2nd Place' : session.rank === 3 ? '🥉 3rd Place' : `Rank #${session.rank}`}
                    </span>
                  </div>

                  <div style={styles.historyMetaRow}>
                    <span><UserCheck size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> Host: <strong>{session.hostName}</strong></span>
                    <span>•</span>
                    <span><Calendar size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>•</span>
                    <span>PIN: <code>{session.pinCode}</code></span>
                  </div>
                </div>
              </div>

              <div className="student-history-stats">
                <div style={styles.historyStatBox}>
                  <div style={styles.historyStatLabel}>Score</div>
                  <div style={styles.historyStatValue}>{session.score.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>pts</span></div>
                </div>

                <div style={styles.historyStatBox}>
                  <div style={styles.historyStatLabel}>Accuracy</div>
                  <div style={{ ...styles.historyStatValue, color: session.accuracy >= 70 ? '#2ed573' : session.accuracy >= 40 ? '#ffa502' : '#ff4757' }}>
                    {session.correctCount}/{session.totalQuestions || session.answeredCount} <span style={{ fontSize: '0.75rem' }}>({session.accuracy}%)</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleViewSessionDetails(session)}
                  className="btn btn-glass"
                  style={styles.reviewBtn}
                  title="View Question Answers"
                >
                  <span>Review</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Detailed Question Breakdown Modal */}
      {selectedSession && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div className="glass-panel" style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Session Review</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  {selectedSession.quizTitle} • Score: <strong>{selectedSession.score} pts</strong> ({selectedSession.accuracy}% accuracy)
                </p>
              </div>
              <button onClick={closeModal} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 10px', color: 'var(--secondary)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Loading question responses...</p>
                </div>
              ) : sessionDetails && sessionDetails.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessionDetails.map((ans, idx) => (
                    <div 
                      key={ans.id || idx} 
                      className="glass-card" 
                      style={{
                        ...styles.answerCard,
                        borderColor: ans.isCorrect ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255, 71, 87, 0.4)',
                        background: ans.isCorrect ? 'rgba(46, 213, 115, 0.06)' : 'rgba(255, 71, 87, 0.06)'
                      }}
                    >
                      <div style={styles.answerHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {ans.isCorrect ? (
                            <CheckCircle2 size={18} color="#2ed573" />
                          ) : (
                            <XCircle size={18} color="#ff4757" />
                          )}
                          <strong style={{ fontSize: '0.95rem' }}>Question {idx + 1}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            <Clock size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                            {(ans.responseTimeMs / 1000).toFixed(1)}s
                          </span>
                          <span style={{ fontWeight: 700, color: ans.isCorrect ? '#2ed573' : 'var(--text-muted)' }}>
                            +{ans.pointsEarned} pts
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.92rem', margin: '8px 0', color: 'var(--text-main)' }}>
                        {ans.questionText}
                      </p>

                      <div style={styles.answerComparison}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Your Answer: </span>
                          <strong style={{ color: ans.isCorrect ? '#2ed573' : '#ff4757' }}>{ans.selectedOption}</strong>
                        </div>
                        {!ans.isCorrect && ans.correctOption && (
                          <div style={{ fontSize: '0.85rem', marginTop: '3px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Correct Answer: </span>
                            <strong style={{ color: '#2ed573' }}>{ans.correctOption}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  No question logs found for this session.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Customization Modal */}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentAvatar={avatar}
          onSave={(newAvatar) => {
            setAvatar(newAvatar);
            localStorage.setItem('qizzy_player_avatar', JSON.stringify(newAvatar));
          }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}

function getRankBadgeStyle(rank) {
  const base = {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.3px',
    display: 'inline-block'
  };

  if (rank === 1) return { ...base, background: 'rgba(251, 191, 36, 0.25)', color: '#fbbf24', border: '1px solid #fbbf24' };
  if (rank === 2) return { ...base, background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', border: '1px solid #38bdf8' };
  if (rank === 3) return { ...base, background: 'rgba(251, 146, 60, 0.25)', color: '#fb923c', border: '1px solid #ea580c' };
  return { ...base, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' };
}

const styles = {
  tierPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '4px 10px',
    borderRadius: '20px',
    marginBottom: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  quickJoinBtn: {
    padding: '10px 18px',
    fontSize: '0.92rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  refreshBtn: {
    padding: '6px 12px',
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  statIconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statLabel: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    marginTop: '2px',
    color: 'var(--text-main)'
  },
  unit: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-muted)'
  },
  statSubtext: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '6px'
  },
  accuracyProgressTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '3px',
    margin: '6px 0 2px',
    overflow: 'hidden'
  },
  accuracyProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--secondary) 0%, #2ed573 100%)',
    borderRadius: '3px',
    transition: 'width 0.5s ease'
  },
  emptyCard: {
    textAlign: 'center',
    padding: '48px 20px',
    borderRadius: '16px'
  },
  emptyIconCircle: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'rgba(209, 204, 192, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  historyCoverWrap: {
    width: '54px',
    height: '54px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0
  },
  historyCover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  historyCoverPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'rgba(132, 129, 122, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  historyInfo: {
    flex: 1
  },
  historyTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '4px'
  },
  historyTitle: {
    fontSize: '1.05rem',
    fontWeight: 700
  },
  historyMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    flexWrap: 'wrap'
  },
  historyStatBox: {
    textAlign: 'right'
  },
  historyStatLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase'
  },
  historyStatValue: {
    fontSize: '1.1rem',
    fontWeight: 800
  },
  reviewBtn: {
    padding: '8px 14px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '620px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '0'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px'
  },
  modalBody: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1
  },
  answerCard: {
    padding: '14px 16px',
    borderRadius: '12px'
  },
  answerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  answerComparison: {
    background: 'rgba(0, 0, 0, 0.25)',
    padding: '8px 12px',
    borderRadius: '8px',
    marginTop: '8px'
  }
};
