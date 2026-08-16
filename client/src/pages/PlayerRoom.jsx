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
  Sparkles
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
      setQuestionStartTime(Date.now());
      setPhase('question');
      setLockedQuote('');
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
      case 'red_triangle': return <Triangle size={48} fill="currentColor" />;
      case 'blue_diamond': return <Diamond size={48} fill="currentColor" />;
      case 'yellow_circle': return <Circle size={48} fill="currentColor" />;
      case 'green_square': return <Square size={48} fill="currentColor" />;
      default: return <Triangle size={48} fill="currentColor" />;
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <Gamepad2 size={32} color="#00cec9" />
              <h1 style={{ fontSize: '1.8rem' }}>Join Qizzy</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Enter the Game PIN from the host projector:
            </p>

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
                  style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', letterSpacing: '4px' }}
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

              <button type="submit" className="btn btn-accent" style={{ padding: '12px', fontSize: '1.05rem', marginTop: '6px' }}>
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
          <div className="glass-panel" style={{ padding: '40px 32px', maxWidth: '440px', width: '100%' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #00cec9 0%, #0984e3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem', fontWeight: 900, color: '#ffffff', boxShadow: '0 0 25px var(--secondary-glow)' }}>
              {nickname.charAt(0).toUpperCase()}
            </div>

            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', color: '#ffffff' }}>You're in, {nickname}! 🎉</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
              Look up at the teacher's screen. The quiz will start shortly!
            </p>

            <div className="badge badge-student" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
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
          <h2 style={{ fontSize: '2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '3px' }}>
            Get Ready!
          </h2>
          <div className="countdown-pulse-number">{countdown}</div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ACTIVE QUESTION (4-COLOR CONTROLLER)                  */}
      {/* ======================================================== */}
      {phase === 'question' && currentQuestion && (
        <div className={`player-buttons-grid ${currentQuestion.questionType === 'true_false' ? 'tf-mode' : ''}`}>
          {currentQuestion.options.map((opt) => (
            <button
              key={opt.id}
              className={`player-btn-controller ${getColorClass(opt.color_shape)}`}
              onClick={() => handleSelectOption(opt.id)}
            >
              {renderShapeIcon(opt.color_shape)}
            </button>
          ))}
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
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: roundResult.isCorrect ? '#27ae60' : '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: roundResult.isCorrect ? '0 0 25px rgba(39, 174, 96, 0.6)' : '0 0 25px rgba(231, 76, 60, 0.6)' }}>
            {roundResult.isCorrect ? <Check size={48} strokeWidth={4} /> : <X size={48} strokeWidth={4} />}
          </div>

          <h1 style={{ fontSize: '2.2rem', color: '#ffffff', fontWeight: 900 }}>
            {roundResult.isCorrect ? 'Correct!' : 'Incorrect'}
          </h1>

          {roundResult.isCorrect ? (
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2ecc71' }}>
              +{roundResult.pointsEarned.toLocaleString()} pts
            </div>
          ) : (
            <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              +0 pts
            </div>
          )}

          {roundResult.streak >= 2 && (
            <div className="badge" style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#ff7675', border: '1px solid rgba(231, 76, 60, 0.4)', padding: '6px 14px', fontSize: '0.85rem' }}>
              <Flame size={16} color="#e74c3c" /> Answer Streak: {roundResult.streak} 🔥
            </div>
          )}

          <div style={{ marginTop: '16px', padding: '12px 24px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Standing: </span>
            <strong style={{ fontSize: '1.1rem', color: '#00cec9' }}>#{roundResult.rank} Place</strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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
          <div className="glass-panel" style={{ padding: '40px 32px', textAlign: 'center', maxWidth: '440px', width: '100%' }}>
            <Trophy size={60} color="#f1c40f" style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 0 15px rgba(241,196,15,0.6))' }} />

            <h1 style={{ fontSize: '2rem', marginBottom: '6px', color: '#ffffff' }}>Quiz Finished! 🎓</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Great effort, {nickname}!
            </p>

            {finalStanding && (
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border-glass)', marginBottom: '28px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Final Rank
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f1c40f', margin: '4px 0' }}>
                  #{finalStanding.rank}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {finalStanding.score.toLocaleString()} Points
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '12px' }}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
