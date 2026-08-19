import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import AvatarPickerModal, { getRandomAvatar, getAvatarColorStyle } from '../components/AvatarPickerModal';
import { 
  playTap, 
  playTick, 
  playStart, 
  playCorrect, 
  playIncorrect, 
  playPodium 
} from '../services/sound';
import { 
  Gamepad2, 
  Play, 
  Lock, 
  Check, 
  X, 
  Flame, 
  Trophy, 
  ArrowLeft, 
  Triangle, 
  Diamond, 
  Circle, 
  Square,
  Shield,
  Shuffle 
} from 'lucide-react';

export default function PlayerRoom() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(() => {
    const saved = localStorage.getItem('qizzy_player_avatar');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return { emoji: '🦊', color: 'sand' };
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [gameMode, setGameMode] = useState('individual');
  const [assignedTeam, setAssignedTeam] = useState(null);

  const [phase, setPhase] = useState('join'); // 'join' | 'lobby' | 'get_ready' | 'question' | 'locked' | 'feedback' | 'game_over'
  const [roomTitle, setRoomTitle] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [lockedQuote, setLockedQuote] = useState('');
  const [roundResult, setRoundResult] = useState(null);
  const [finalStanding, setFinalStanding] = useState(null);
  const [midGameInfo, setMidGameInfo] = useState(null);
  const [error, setError] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('game:starting', (data) => {
      setPhase('get_ready');
      setCountdown(data.count || 3);
      if (data.gameMode) setGameMode(data.gameMode);
      playStart();
    });

    socket.on('player:team_assigned', (data) => {
      if (data.gameMode) setGameMode(data.gameMode);
      setAssignedTeam(data.team || null);
    });

    socket.on('player:question_start', (data) => {
      setCurrentQuestion(data);
      setTimeLeft(data.timeSeconds || 20);
      setQuestionStartTime(Date.now());
      setPhase('question');
      setLockedQuote('');
      playStart();
    });

    socket.on('game:timer_tick', (data) => {
      setTimeLeft(data.timeLeft);
      if (data.timeLeft <= 5 && data.timeLeft > 0) {
        playTick(data.timeLeft <= 2);
      }
    });

    socket.on('game:question_time_up', () => {
      if (phase === 'question') {
        setPhase('locked');
        setLockedQuote('Time is up! ⏰');
      }
    });

    socket.on('player:round_result', (data) => {
      setRoundResult(data);
      if (data.team) setAssignedTeam(data.team);
      setPhase('feedback');
      if (data.isCorrect) {
        playCorrect();
      } else {
        playIncorrect();
      }
    });

    socket.on('game:leaderboard_update', () => {
      // Waiting for next question during leaderboard
    });

    socket.on('game:final_results', (data) => {
      setPhase('game_over');
      if (data.gameMode) setGameMode(data.gameMode);
      const myStanding = data.standings?.find(s => s.name === nickname || (user && s.userId === user.id));
      setFinalStanding(myStanding || null);
      playPodium();
    });

    socket.on('game:room_closed', () => {
      alert('The host has ended this game session.');
      navigate('/dashboard');
    });

    return () => {
      socket.off('game:starting');
      socket.off('player:team_assigned');
      socket.off('player:question_start');
      socket.off('game:timer_tick');
      socket.off('game:question_time_up');
      socket.off('player:round_result');
      socket.off('game:leaderboard_update');
      socket.off('game:final_results');
      socket.off('game:room_closed');
    };
  }, [phase, nickname, user, navigate]);

  // Handle Joining Game
  const handleJoin = (e) => {
    e?.preventDefault();
    if (!pin.trim() || !nickname.trim()) {
      setError('Please enter both Game PIN and Nickname.');
      return;
    }

    setError('');
    const socket = getSocket();

    // Persist chosen avatar
    localStorage.setItem('qizzy_player_avatar', JSON.stringify(avatar));

    socket.emit('player:join_game', {
      pin: pin.trim(),
      token,
      nickname: nickname.trim(),
      avatar
    }, (response) => {
      if (response?.error) {
        setError(response.error);
      } else if (response?.success) {
        setRoomTitle(response.title);
        setNickname(response.nickname);
        if (response.avatar) setAvatar(response.avatar);
        if (response.gameMode) setGameMode(response.gameMode);
        if (response.team) setAssignedTeam(response.team);

        if (response.isMidGame) {
          setMidGameInfo({
            currentQuestionIndex: response.currentQuestionIndex,
            totalQuestions: response.totalQuestions
          });

          if (response.gameStatus === 'question_active' && response.activeQuestion) {
            setCurrentQuestion(response.activeQuestion);
            setTimeLeft(response.activeQuestion.timeLeft);
            setQuestionStartTime(Date.now() - ((response.activeQuestion.timeSeconds || 20) - response.activeQuestion.timeLeft) * 1000);
            setPhase('question');
            setLockedQuote('');
            playStart();
          } else if (response.gameStatus === 'countdown') {
            setPhase('get_ready');
            setCountdown(3);
            playStart();
          } else {
            setPhase('mid_game_waiting');
          }
        } else {
          setPhase('lobby');
        }
      }
    });
  };

  // Handle Answer Selection (Single-Tap Lock)
  const handleSelectOption = (optionId) => {
    if (phase !== 'question') return;

    playTap();
    const responseTimeMs = Date.now() - questionStartTime;
    const socket = getSocket();

    socket.emit('player:submit_answer', {
      pin: pin.trim(),
      optionId,
      responseTimeMs
    }, (res) => {
      if (res?.success) {
        setLockedQuote(res.wittyQuote || 'Locked in! 🎯');
        setPhase('locked');
      } else if (res?.error) {
        setError(res.error);
      }
    });
  };

  const renderShapeIcon = (colorShape) => {
    switch (colorShape) {
      case 'red_triangle': return <Triangle size={28} fill="currentColor" />;
      case 'blue_diamond': return <Diamond size={28} fill="currentColor" />;
      case 'yellow_circle': return <Circle size={28} fill="currentColor" />;
      case 'green_square': return <Square size={28} fill="currentColor" />;
      default: return <Triangle size={28} fill="currentColor" />;
    }
  };

  const getColorClass = (colorShape) => {
    switch (colorShape) {
      case 'red_triangle': return 'option-red';
      case 'blue_diamond': return 'option-blue';
      case 'yellow_circle': return 'option-yellow';
      case 'green_square': return 'option-green';
      default: return 'option-red';
    }
  };

  const activeColorObj = getAvatarColorStyle(avatar.color);

  return (
    <div className="player-controller-container">
      {/* ======================================================== */}
      {/* 1. JOIN FORM PHASE                                       */}
      {/* ======================================================== */}
      {phase === 'join' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <Gamepad2 size={32} color="var(--secondary)" />
              <h1 style={{ fontSize: '1.85rem', margin: 0 }}>Join Qizzy</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Pick your avatar and enter the Game PIN:
            </p>

            {/* Interactive Avatar Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px' }}>
              <div 
                onClick={() => setShowAvatarPicker(true)}
                style={{ 
                  width: '78px', 
                  height: '78px', 
                  borderRadius: '50%', 
                  background: activeColorObj.gradient,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2.3rem', 
                  cursor: 'pointer',
                  boxShadow: `0 0 20px ${activeColorObj.border}50`,
                  border: `3px solid ${activeColorObj.border}`,
                  marginBottom: '8px',
                  transition: 'transform 0.15s ease'
                }}
                title="Click to change your avatar"
              >
                {avatar.emoji}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="btn btn-secondary"
                  style={{ padding: '3px 12px', fontSize: '0.78rem', borderRadius: '12px' }}
                >
                  ✏️ Change Avatar
                </button>
                <button
                  type="button"
                  onClick={() => setAvatar(getRandomAvatar())}
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', fontSize: '0.78rem', borderRadius: '12px' }}
                  title="Random Avatar"
                >
                  <Shuffle size={12} />
                </button>
              </div>
            </div>

            {error && (
              <div className="error-banner" style={{ marginBottom: '18px' }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>6-Digit Game PIN</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 849201"
                  maxLength={6}
                  style={{ fontSize: '1.35rem', fontWeight: 900, textAlign: 'center', letterSpacing: '5px' }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Your Nickname</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your name"
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-accent" style={{ padding: '13px', fontSize: '1.05rem', marginTop: '6px' }}>
                <Play size={18} /> Enter Game
              </button>
            </form>
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

      {/* ======================================================== */}
      {/* 2. WAITING LOBBY PHASE                                   */}
      {/* ======================================================== */}
      {phase === 'lobby' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '40px 28px', maxWidth: '440px', width: '100%' }}>
            <div 
              style={{ 
                width: '88px', 
                height: '88px', 
                borderRadius: '50%', 
                background: activeColorObj.gradient, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px', 
                fontSize: '2.5rem', 
                boxShadow: `0 0 28px ${activeColorObj.border}50`,
                border: `3px solid ${activeColorObj.border}`
              }}
            >
              {avatar.emoji}
            </div>

            <h2 style={{ fontSize: '1.7rem', marginBottom: '6px', color: '#ffffff' }}>You're in, {nickname}! 🎉</h2>
            
            {assignedTeam && (
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: assignedTeam.bg || assignedTeam.color, 
                  color: '#ffffff', 
                  padding: '6px 18px', 
                  borderRadius: '20px', 
                  fontWeight: 800, 
                  fontSize: '0.92rem', 
                  margin: '12px 0 16px',
                  boxShadow: `0 4px 15px ${assignedTeam.color}50`
                }}
              >
                <span>{assignedTeam.icon}</span>
                <span>{assignedTeam.name}</span>
              </div>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '22px' }}>
              Look up at the teacher's screen. The quiz will start shortly!
            </p>

            <div className="badge badge-student" style={{ padding: '8px 20px', fontSize: '0.88rem' }}>
              Room: {roomTitle}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2B. MID-GAME WAITING PHASE (JOINED DURING QUESTION/REVEAL) */}
      {/* ======================================================== */}
      {phase === 'mid_game_waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '40px 28px', maxWidth: '460px', width: '100%' }}>
            <div 
              style={{ 
                width: '88px', 
                height: '88px', 
                borderRadius: '50%', 
                background: activeColorObj.gradient, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px', 
                fontSize: '2.5rem', 
                boxShadow: `0 0 28px ${activeColorObj.border}50`,
                border: `3px solid ${activeColorObj.border}`
              }}
            >
              {avatar.emoji}
            </div>

            <h2 style={{ fontSize: '1.65rem', marginBottom: '6px', color: '#ffffff' }}>Joined Mid-Game! 🎯</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '16px', lineHeight: 1.5 }}>
              Welcome, <strong>{nickname}</strong>! You've joined <strong>{roomTitle}</strong> while it's in progress.
            </p>

            {assignedTeam && (
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: assignedTeam.bg || assignedTeam.color, 
                  color: '#ffffff', 
                  padding: '6px 18px', 
                  borderRadius: '20px', 
                  fontWeight: 800, 
                  fontSize: '0.9rem', 
                  marginBottom: '16px' 
                }}
              >
                <span>{assignedTeam.icon}</span>
                <span>{assignedTeam.name}</span>
              </div>
            )}

            {midGameInfo && (
              <div className="badge badge-student" style={{ padding: '8px 18px', fontSize: '0.86rem', marginBottom: '16px' }}>
                Question {(midGameInfo.currentQuestionIndex || 0) + 1} of {midGameInfo.totalQuestions || '?'} in progress
              </div>
            )}

            <p style={{ fontSize: '0.88rem', color: 'var(--accent-light)', opacity: 0.95, background: 'rgba(255,255,255,0.06)', padding: '10px 16px', borderRadius: '10px', marginTop: '8px' }}>
              Hang tight! You'll automatically join on the next question. ⏳
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. GET READY COUNTDOWN (3-2-1)                           */}
      {/* ======================================================== */}
      {phase === 'get_ready' && (
        <div className="get-ready-screen">
          <h2 style={{ fontSize: '2.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '3px' }}>
            Get Ready!
          </h2>
          <div className="countdown-pulse-number">{countdown}</div>
          {assignedTeam && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: assignedTeam.color, fontWeight: 800, marginTop: '12px' }}>
              <span>{assignedTeam.icon}</span> {assignedTeam.name}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ACTIVE QUESTION                                       */}
      {/* ======================================================== */}
      {phase === 'question' && currentQuestion && (
        <div className="player-question-container">
          {/* Top Bar: Question Index, Team Pill & Circular Glow Timer */}
          <div className="glass-panel player-top-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-student" style={{ fontSize: '0.82rem' }}>
                Q {currentQuestion.questionIndex + 1} / {currentQuestion.totalQuestions}
              </span>
              {assignedTeam && (
                <span className="badge" style={{ background: `${assignedTeam.color}35`, color: assignedTeam.color, border: `1px solid ${assignedTeam.color}60`, fontWeight: 800 }}>
                  {assignedTeam.icon} {assignedTeam.name}
                </span>
              )}
              <span className="badge" style={{ background: 'rgba(255, 211, 42, 0.15)', color: '#ffd32a', border: '1px solid rgba(255, 211, 42, 0.3)' }}>
                🏆 {currentQuestion.points || 1000} pts
              </span>
            </div>

            {/* Glowing Circular Timer */}
            <div className={`player-timer-circle ${timeLeft <= 5 ? 'danger' : timeLeft <= 10 ? 'warning' : ''}`}>
              {timeLeft}
            </div>
          </div>

          {/* Prominent Question Prompt Box */}
          <div className="glass-panel player-prompt-card">
            <h2 className="player-prompt-text">
              {currentQuestion.questionText}
            </h2>
          </div>

          {/* 4 Colored Answer Cards Grid */}
          <div className={`player-options-grid ${currentQuestion.questionType === 'true_false' ? 'tf-mode' : ''}`}>
            {currentQuestion.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`player-option-card ${getColorClass(opt.color_shape)}`}
                onClick={() => handleSelectOption(opt.id)}
              >
                <div className="shape-badge">
                  {renderShapeIcon(opt.color_shape)}
                </div>
                <div className="player-option-text">
                  {opt.option_text}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SINGLE-TAP LOCKED & WITTY WAITING SCREEN              */}
      {/* ======================================================== */}
      {phase === 'locked' && (
        <div className="player-waiting-screen">
          <div className="lock-badge-icon">
            <Lock size={44} strokeWidth={2.5} />
          </div>

          <h2 className="witty-quote-text">
            "{lockedQuote}"
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Answer locked in! Waiting for all players to finish... ⏳
          </p>

          {assignedTeam && (
            <div style={{ marginTop: '12px', fontSize: '0.88rem', color: assignedTeam.color, fontWeight: 700 }}>
              <span>{assignedTeam.icon} For {assignedTeam.name}</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ROUND FEEDBACK SCREEN                                 */}
      {/* ======================================================== */}
      {phase === 'feedback' && roundResult && (
        <div className={`round-feedback-screen ${roundResult.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: roundResult.isCorrect ? '#2ed573' : '#ff4757', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: roundResult.isCorrect ? '0 0 30px rgba(46, 213, 115, 0.6)' : '0 0 30px rgba(255, 71, 87, 0.6)' }}>
            {roundResult.isCorrect ? <Check size={48} strokeWidth={4} /> : <X size={48} strokeWidth={4} />}
          </div>

          <h1 style={{ fontSize: '2.2rem', color: '#ffffff', fontWeight: 900 }}>
            {roundResult.isCorrect ? 'Correct!' : 'Incorrect'}
          </h1>

          {roundResult.isCorrect ? (
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2ed573' }}>
              +{roundResult.pointsEarned.toLocaleString()} pts
            </div>
          ) : (
            <div style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>
              +0 pts
            </div>
          )}

          {roundResult.streak >= 2 && (
            <div className="badge" style={{ background: 'rgba(255, 71, 87, 0.2)', color: '#ff6b81', border: '1px solid rgba(255, 71, 87, 0.4)', padding: '7px 16px', fontSize: '0.9rem' }}>
              <Flame size={16} color="#ff4757" /> Answer Streak: {roundResult.streak} 🔥
            </div>
          )}

          {assignedTeam && (
            <div style={{ fontSize: '0.92rem', color: assignedTeam.color, fontWeight: 700, margin: '8px 0' }}>
              {assignedTeam.icon} Contributed to {assignedTeam.name}
            </div>
          )}

          <div style={{ marginTop: '14px', padding: '14px 26px', background: 'rgba(0, 0, 0, 0.5)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Standing: </span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--secondary)' }}>#{roundResult.rank} Place</strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total Score: {roundResult.totalScore.toLocaleString()} pts
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. FINAL GAME OVER SCREEN                                */}
      {/* ======================================================== */}
      {phase === 'game_over' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '40px 28px', textAlign: 'center', maxWidth: '440px', width: '100%' }}>
            <Trophy size={58} color="#ffd32a" style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 0 20px rgba(255,211,42,0.6))' }} />

            <h1 style={{ fontSize: '2rem', marginBottom: '6px', color: '#ffffff' }}>Quiz Finished! 🎓</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Great effort, {nickname}!
            </p>

            {assignedTeam && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: assignedTeam.color, color: '#ffffff', padding: '6px 18px', borderRadius: '20px', fontWeight: 800, marginBottom: '20px' }}>
                <span>{assignedTeam.icon}</span> {assignedTeam.name}
              </div>
            )}

            {finalStanding && (
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-glass)', marginBottom: '26px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Final Rank
                </div>
                <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#ffd32a', margin: '4px 0' }}>
                  #{finalStanding.rank}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {finalStanding.score.toLocaleString()} Points
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '13px' }}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  topControlBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    padding: '0 4px',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto 8px'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center'
  },
  soundToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
