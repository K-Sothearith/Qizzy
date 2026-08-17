import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { 
  Gamepad2, 
  Play, 
  Lock, 
  Check, 
  X, 
  Flame, 
  Trophy, 
  Award, 
  ArrowLeft, 
  Triangle, 
  Diamond, 
  Circle, 
  Square,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function PlayerRoom() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState(user?.name || '');
  const [phase, setPhase] = useState('join'); // 'join' | 'lobby' | 'get_ready' | 'question' | 'locked' | 'feedback' | 'game_over'
  const [roomTitle, setRoomTitle] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [lockedQuote, setLockedQuote] = useState('');
  const [roundResult, setRoundResult] = useState(null);
  const [finalStanding, setFinalStanding] = useState(null);
  const [error, setError] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('game:starting', (data) => {
      setPhase('get_ready');
      setCountdown(data.count || 3);
    });

    socket.on('player:question_start', (data) => {
      setCurrentQuestion(data);
      setTimeLeft(data.timeSeconds || 20);
      setQuestionStartTime(Date.now());
      setPhase('question');
      setLockedQuote('');
    });

    socket.on('game:timer_tick', (data) => {
      setTimeLeft(data.timeLeft);
    });

    socket.on('game:question_time_up', () => {
      // If student hasn't answered, lock them out with time-up
      if (phase === 'question') {
        setPhase('locked');
        setLockedQuote('Time is up! ⏰');
      }
    });

    socket.on('player:round_result', (data) => {
      setRoundResult(data);
      setPhase('feedback');
    });

    socket.on('game:leaderboard_update', () => {
      // Waiting for next question during leaderboard
    });

    socket.on('game:final_results', (data) => {
      setPhase('game_over');
      const myStanding = data.standings?.find(s => s.name === nickname || (user && s.userId === user.id));
      setFinalStanding(myStanding || null);
    });

    socket.on('game:room_closed', () => {
      setError('The host has ended this quiz session.');
      setPhase('join');
    });

    return () => {
      socket.off('game:starting');
      socket.off('player:question_start');
      socket.off('game:timer_tick');
      socket.off('game:question_time_up');
      socket.off('player:round_result');
      socket.off('game:leaderboard_update');
      socket.off('game:final_results');
      socket.off('game:room_closed');
    };
  }, [phase, nickname, user]);

  // Handle Joining Game
  const handleJoin = (e) => {
    e?.preventDefault();
    if (!pin.trim() || !nickname.trim()) {
      setError('Please enter both Game PIN and Nickname.');
      return;
    }

    setError('');
    const socket = getSocket();

    socket.emit('player:join_game', {
      pin: pin.trim(),
      token,
      nickname: nickname.trim()
    }, (response) => {
      if (response?.error) {
        setError(response.error);
      } else if (response?.success) {
        setRoomTitle(response.title);
        setNickname(response.nickname);
        setPhase('lobby');
      }
    });
  };

  // Handle Answer Selection (Single-Tap Lock)
  const handleSelectOption = (optionId) => {
    if (phase !== 'question') return;

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

  return (
    <div className="player-controller-container">
      {/* ======================================================== */}
      {/* 1. JOIN FORM PHASE                                       */}
      {/* ======================================================== */}
      {phase === 'join' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '36px 30px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
              <Gamepad2 size={34} color="#00cec9" />
              <h1 style={{ fontSize: '1.9rem' }}>Join Qizzy</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '24px' }}>
              Enter the Game PIN from the teacher's screen:
            </p>

            {error && (
              <div className="error-banner" style={{ marginBottom: '18px' }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>6-Digit Game PIN</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 849201"
                  maxLength={6}
                  style={{ fontSize: '1.35rem', fontWeight: 800, textAlign: 'center', letterSpacing: '5px' }}
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

      {/* ======================================================== */}
      {/* 2. WAITING LOBBY PHASE                                   */}
      {/* ======================================================== */}
      {phase === 'lobby' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '44px 36px', maxWidth: '460px', width: '100%' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg, #00cec9 0%, #0984e3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', boxShadow: '0 0 30px var(--secondary-glow)' }}>
              {nickname.charAt(0).toUpperCase()}
            </div>

            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', color: '#ffffff' }}>You're in, {nickname}! 🎉</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '26px' }}>
              Look up at the teacher's screen. The quiz will start shortly!
            </p>

            <div className="badge badge-student" style={{ padding: '8px 20px', fontSize: '0.88rem' }}>
              Room: {roomTitle}
            </div>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ACTIVE QUESTION (PREMIUM ADMIN-INSPIRED DESIGN)       */}
      {/* ======================================================== */}
      {phase === 'question' && currentQuestion && (
        <div className="player-question-container">
          {/* Top Bar: Question Index & Circular Glow Timer */}
          <div className="glass-panel player-top-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-student" style={{ fontSize: '0.85rem' }}>
                Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
              </span>
              <span className="badge" style={{ background: 'rgba(243, 156, 18, 0.15)', color: '#f39c12', border: '1px solid rgba(243, 156, 18, 0.3)' }}>
                🏆 {currentQuestion.points || 1000} pts
              </span>
            </div>

            {/* Glowing Circular Timer */}
            <div className={`player-timer-circle ${timeLeft <= 5 ? 'danger' : timeLeft <= 10 ? 'warning' : ''}`}>
              {timeLeft}
            </div>
          </div>

          {/* Big Prominent Question Prompt Box */}
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
            <Lock size={46} strokeWidth={2.5} />
          </div>

          <h2 className="witty-quote-text">
            "{lockedQuote}"
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Answer locked in! Waiting for all players to finish... ⏳
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ROUND FEEDBACK SCREEN                                 */}
      {/* ======================================================== */}
      {phase === 'feedback' && roundResult && (
        <div className={`round-feedback-screen ${roundResult.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: roundResult.isCorrect ? '#27ae60' : '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: roundResult.isCorrect ? '0 0 30px rgba(39, 174, 96, 0.6)' : '0 0 30px rgba(231, 76, 60, 0.6)' }}>
            {roundResult.isCorrect ? <Check size={52} strokeWidth={4} /> : <X size={52} strokeWidth={4} />}
          </div>

          <h1 style={{ fontSize: '2.4rem', color: '#ffffff', fontWeight: 900 }}>
            {roundResult.isCorrect ? 'Correct!' : 'Incorrect'}
          </h1>

          {roundResult.isCorrect ? (
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2ecc71' }}>
              +{roundResult.pointsEarned.toLocaleString()} pts
            </div>
          ) : (
            <div style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>
              +0 pts
            </div>
          )}

          {roundResult.streak >= 2 && (
            <div className="badge" style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#ff7675', border: '1px solid rgba(231, 76, 60, 0.4)', padding: '7px 16px', fontSize: '0.9rem' }}>
              <Flame size={16} color="#e74c3c" /> Answer Streak: {roundResult.streak} 🔥
            </div>
          )}

          <div style={{ marginTop: '18px', padding: '14px 28px', background: 'rgba(0, 0, 0, 0.45)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>Current Standing: </span>
            <strong style={{ fontSize: '1.2rem', color: '#00cec9' }}>#{roundResult.rank} Place</strong>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total Score: {roundResult.totalScore.toLocaleString()} pts
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. FINAL GAME OVER SCREEN                                */}
      {/* ======================================================== */}
      {phase === 'game_over' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel" style={{ padding: '44px 36px', textAlign: 'center', maxWidth: '460px', width: '100%' }}>
            <Trophy size={64} color="#f1c40f" style={{ margin: '0 auto 18px', filter: 'drop-shadow(0 0 20px rgba(241,196,15,0.6))' }} />

            <h1 style={{ fontSize: '2.1rem', marginBottom: '6px', color: '#ffffff' }}>Quiz Finished! 🎓</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '26px' }}>
              Great effort, {nickname}!
            </p>

            {finalStanding && (
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '22px', border: '1px solid var(--border-glass)', marginBottom: '30px' }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Final Rank
                </div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#f1c40f', margin: '4px 0' }}>
                  #{finalStanding.rank}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
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
