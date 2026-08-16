import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Play, 
  Trophy, 
  Award, 
  Flame, 
  Check, 
  Triangle, 
  Diamond, 
  Circle, 
  Square, 
  ArrowRight, 
  ArrowLeft,
  Copy,
  CheckCheck,
  Crown,
  HelpCircle
} from 'lucide-react';

export default function HostRoom() {
  const { quizId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [pin, setPin] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [phase, setPhase] = useState('initializing'); // 'lobby' | 'countdown' | 'question' | 'reveal' | 'leaderboard' | 'podium'
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [revealData, setRevealData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [podiumData, setPodiumData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const pinRef = useRef(null);

  // Keep pinRef in sync with pin state
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  // Initialize Host Room via Socket (runs once when mounting host room)
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('host:create_room', { quizId, token }, (response) => {
      if (response?.error) {
        setError(response.error);
      } else if (response?.success) {
        setPin(response.pin);
        pinRef.current = response.pin;
        setQuizTitle(response.title);
        setPhase('lobby');
      }
    });

    // Socket Event Listeners
    socket.on('host:player_joined', (data) => {
      setPlayers(data.players || []);
      setTotalPlayers(data.totalPlayers || 0);
    });

    socket.on('host:player_left', (data) => {
      setPlayers(data.players || []);
      setTotalPlayers(data.totalPlayers || 0);
    });

    socket.on('game:starting', (data) => {
      setPhase('countdown');
      setCountdown(data.count || 3);
    });

    socket.on('game:question_start', (data) => {
      setPhase('question');
      setCurrentQuestion(data);
      setTimeLeft(data.timeSeconds || 20);
      setAnsweredCount(0);
      setTotalPlayers(data.totalPlayers || 0);
    });

    socket.on('game:timer_tick', (data) => {
      setTimeLeft(data.timeLeft);
    });

    socket.on('host:answer_count_update', (data) => {
      setAnsweredCount(data.answeredCount || 0);
      setTotalPlayers(data.totalPlayers || 0);
    });

    socket.on('game:question_time_up', () => {
      // Trigger answer reveal on host using current pin
      if (socketRef.current && pinRef.current) {
        socketRef.current.emit('host:reveal_answers', { pin: pinRef.current });
      }
    });

    socket.on('host:show_answer_reveal', (data) => {
      setPhase('reveal');
      setRevealData(data);
    });

    socket.on('game:leaderboard_update', (data) => {
      setPhase('leaderboard');
      setLeaderboardData(data);
    });

    socket.on('game:final_results', (data) => {
      setPhase('podium');
      setPodiumData(data);
      launchConfetti();
    });

    return () => {
      socket.off('host:player_joined');
      socket.off('host:player_left');
      socket.off('game:starting');
      socket.off('game:question_start');
      socket.off('game:timer_tick');
      socket.off('host:answer_count_update');
      socket.off('game:question_time_up');
      socket.off('host:show_answer_reveal');
      socket.off('game:leaderboard_update');
      socket.off('game:final_results');
    };
  }, [quizId, token]);

  // Countdown pulse effect
  useEffect(() => {
    if (phase === 'countdown' && countdown > 1) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, countdown]);

  // Confetti fireworks on podium
  const launchConfetti = () => {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // Host Action: Start Game
  const handleStartGame = () => {
    if (!socketRef.current || !pin) return;
    socketRef.current.emit('host:start_game', { pin }, (res) => {
      if (res?.error) setError(res.error);
    });
  };

  // Host Action: Advance to Leaderboard
  const handleShowLeaderboard = () => {
    if (!socketRef.current || !pin) return;
    socketRef.current.emit('host:show_leaderboard', { pin });
  };

  // Host Action: Next Question
  const handleNextQuestion = () => {
    if (!socketRef.current || !pin) return;
    socketRef.current.emit('host:next_question', { pin });
  };

  // Host Action: Finish Game
  const handleFinishGame = () => {
    if (!socketRef.current || !pin) return;
    socketRef.current.emit('host:finish_game', { pin });
  };

  // Copy Direct Join Link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/join?pin=${pin}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const renderShapeIcon = (colorShape) => {
    switch (colorShape) {
      case 'red_triangle': return <Triangle size={24} fill="currentColor" />;
      case 'blue_diamond': return <Diamond size={24} fill="currentColor" />;
      case 'yellow_circle': return <Circle size={24} fill="currentColor" />;
      case 'green_square': return <Square size={24} fill="currentColor" />;
      default: return <Triangle size={24} fill="currentColor" />;
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

  const joinUrl = pin ? `${window.location.origin}/join?pin=${pin}` : '';

  if (error) {
    return (
      <div className="host-screen-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '480px' }}>
          <h2 style={{ color: '#ff7675', marginBottom: '14px' }}>Session Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="host-screen-container">
      {/* ======================================================== */}
      {/* 1. LOBBY PHASE                                           */}
      {/* ======================================================== */}
      {phase === 'lobby' && (
        <>
          {/* Top Banner */}
          <header className="glass-panel host-lobby-header">
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Hosting Live Quiz
              </span>
              <h1 style={{ fontSize: '1.8rem', color: '#ffffff' }}>{quizTitle}</h1>
            </div>

            <div className="pin-display-card">
              <span className="pin-label">Game PIN:</span>
              <div className="pin-number">{pin}</div>
            </div>

            <div>
              <button 
                className="btn btn-accent" 
                style={{ padding: '12px 28px', fontSize: '1.1rem' }}
                onClick={handleStartGame}
                disabled={players.length === 0}
              >
                <Play size={20} /> Start Quiz ({players.length})
              </button>
            </div>
          </header>

          {/* Lobby Body: QR Code + Live Player Grid */}
          <div className="host-lobby-body">
            {/* Left: Dynamic QR Code Card */}
            <div className="glass-panel qr-code-card">
              <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Join with Mobile</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Scan to auto-join or visit <strong>{window.location.host}/join</strong>
              </p>

              <div className="qr-box">
                {joinUrl && (
                  <QRCodeSVG 
                    value={joinUrl} 
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                )}
              </div>

              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '0.85rem' }}
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <>
                    <CheckCheck size={16} color="#00cec9" /> Link Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Join Link
                  </>
                )}
              </button>
            </div>

            {/* Right: Joined Players Grid */}
            <div className="glass-panel players-lobby-panel">
              <div className="players-lobby-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={22} color="#00cec9" />
                  <h2 style={{ fontSize: '1.3rem' }}>Players in Lobby ({players.length})</h2>
                </div>
                {players.length === 0 && (
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Waiting for players to join...
                  </span>
                )}
              </div>

              {players.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6, gap: '12px' }}>
                  <Users size={48} color="#6c5ce7" />
                  <p style={{ color: 'var(--text-muted)' }}>Students will appear here as they enter the PIN.</p>
                </div>
              ) : (
                <div className="players-grid">
                  {players.map((p, idx) => (
                    <div key={idx} className="player-lobby-badge">
                      <div className="player-avatar-circle">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="player-name-text">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 2. GET READY COUNTDOWN (3-2-1)                           */}
      {/* ======================================================== */}
      {phase === 'countdown' && (
        <div className="get-ready-screen">
          <h2 style={{ fontSize: '2.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '3px' }}>
            Get Ready!
          </h2>
          <div className="countdown-pulse-number">{countdown}</div>
          <p style={{ fontSize: '1.2rem', color: '#ffffff' }}>{quizTitle}</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ACTIVE QUESTION PHASE                                 */}
      {/* ======================================================== */}
      {phase === 'question' && currentQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header Bar */}
          <div className="glass-panel host-question-header">
            <div>
              <span className="badge badge-admin" style={{ fontSize: '0.85rem' }}>
                Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
              </span>
            </div>

            {/* Synchronized Circular Countdown Timer */}
            <div className={`host-timer-circle ${timeLeft <= 5 ? 'danger' : timeLeft <= 10 ? 'warning' : ''}`}>
              {timeLeft}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#ffffff', fontWeight: 700 }}>
              <Users size={18} color="#00cec9" />
              <span>{answeredCount} / {totalPlayers} Answered</span>
            </div>
          </div>

          {/* Big Question Prompt Box */}
          <div className="host-question-box">
            <h2 className="host-question-text">{currentQuestion.questionText}</h2>
          </div>

          {/* 4 Colored Options Grid */}
          <div className="host-options-grid">
            {currentQuestion.options.map((opt) => (
              <div key={opt.id} className={`host-option-card ${getColorClass(opt.color_shape)}`}>
                <div className="shape-badge">
                  {renderShapeIcon(opt.color_shape)}
                </div>
                <div className="host-option-text">{opt.option_text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ANSWER REVEAL & BAR CHART PHASE                       */}
      {/* ======================================================== */}
      {phase === 'reveal' && revealData && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="glass-panel host-question-header">
            <h2 style={{ fontSize: '1.3rem' }}>Answer Breakdown</h2>
            <button className="btn btn-accent" onClick={handleShowLeaderboard}>
              Next: Leaderboard <ArrowRight size={18} />
            </button>
          </div>

          {/* Question Prompt Recap */}
          <div className="host-question-box" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.4rem' }}>{revealData.questionText}</h3>
          </div>

          {/* Vertical Distribution Bar Chart */}
          <div className="glass-panel answer-chart-container">
            {revealData.options.map((opt) => {
              const count = revealData.distribution[opt.id] || 0;
              const total = Math.max(revealData.totalAnswered, 1);
              const heightPercent = Math.max(Math.round((count / total) * 100), 12);
              const isCorrect = opt.id === revealData.correctOptionId;

              return (
                <div key={opt.id} className="chart-bar-column">
                  <div 
                    className={`chart-bar-fill ${getColorClass(opt.color_shape)}`}
                    style={{ height: `${heightPercent}%`, opacity: isCorrect ? 1 : 0.6 }}
                  >
                    {count}
                  </div>
                  <div style={{ color: isCorrect ? '#2ecc71' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}>
                    {renderShapeIcon(opt.color_shape)}
                    {isCorrect && <Check size={18} strokeWidth={4} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4 Color Options Grid with Highlighted Correct Answer */}
          <div className="host-options-grid">
            {revealData.options.map((opt) => {
              const isCorrect = opt.id === revealData.correctOptionId;
              return (
                <div 
                  key={opt.id} 
                  className={`host-option-card ${getColorClass(opt.color_shape)} ${isCorrect ? 'correct-highlight' : 'dimmed'}`}
                >
                  <div className="shape-badge">
                    {renderShapeIcon(opt.color_shape)}
                  </div>
                  <div className="host-option-text" style={{ flex: 1 }}>{opt.option_text}</div>
                  {isCorrect && (
                    <div style={{ background: '#ffffff', color: '#27ae60', borderRadius: '50%', padding: '6px', display: 'flex' }}>
                      <Check size={24} strokeWidth={4} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. LEADERBOARD PHASE                                     */}
      {/* ======================================================== */}
      {phase === 'leaderboard' && leaderboardData && (
        <div className="leaderboard-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Trophy size={28} color="#f1c40f" />
              <h2 style={{ fontSize: '1.8rem' }}>Top Scores</h2>
            </div>

            {leaderboardData.isLastQuestion ? (
              <button className="btn btn-primary" onClick={handleFinishGame}>
                View Final Podium 🏆
              </button>
            ) : (
              <button className="btn btn-accent" onClick={handleNextQuestion}>
                Next Question <ArrowRight size={18} />
              </button>
            )}
          </div>

          <div className="leaderboard-list">
            {leaderboardData.leaderboard.map((player) => (
              <div key={player.rank} className={`leaderboard-row rank-${player.rank}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="leaderboard-rank-badge">{player.rank}</div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{player.name}</span>
                  {player.streak >= 2 && (
                    <span className="badge" style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#ff7675', border: '1px solid rgba(231, 76, 60, 0.4)' }}>
                      <Flame size={14} color="#e74c3c" /> {player.streak} in a row!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {player.lastPoints > 0 && (
                    <span style={{ color: '#2ecc71', fontSize: '0.9rem', fontWeight: 700 }}>
                      +{player.lastPoints}
                    </span>
                  )}
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                    {player.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. 3D PODIUM CELEBRATION PHASE                           */}
      {/* ======================================================== */}
      {phase === 'podium' && podiumData && (
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#f1c40f', textShadow: '0 0 25px rgba(241, 196, 15, 0.4)' }}>
            🎉 Quiz Champions! 🎉
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Congratulations to everyone who participated in <strong>{quizTitle}</strong>!
          </p>

          {/* 3D Olympic Podium Steps */}
          <div className="podium-container">
            {/* 2nd Place */}
            {podiumData.podium.second && (
              <div className="podium-column">
                <div className="podium-player-card">
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ffffff' }}>
                    {podiumData.podium.second.name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {podiumData.podium.second.score.toLocaleString()} pts
                  </div>
                </div>
                <div className="podium-step podium-second">2</div>
              </div>
            )}

            {/* 1st Place */}
            {podiumData.podium.first && (
              <div className="podium-column">
                <Crown size={38} color="#f1c40f" style={{ marginBottom: '8px', filter: 'drop-shadow(0 0 10px rgba(241,196,15,0.7))' }} />
                <div className="podium-player-card">
                  <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#f1c40f' }}>
                    {podiumData.podium.first.name}
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700 }}>
                    {podiumData.podium.first.score.toLocaleString()} pts
                  </div>
                </div>
                <div className="podium-step podium-first">1</div>
              </div>
            )}

            {/* 3rd Place */}
            {podiumData.podium.third && (
              <div className="podium-column">
                <div className="podium-player-card">
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>
                    {podiumData.podium.third.name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {podiumData.podium.third.score.toLocaleString()} pts
                  </div>
                </div>
                <div className="podium-step podium-third">3</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '40px' }}>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ padding: '12px 32px' }}>
              Back to Teacher Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
