import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isMuted as getIsMuted, toggleMute as toggleSoundMute } from '../services/sound';
import { Target, LogOut, User, ShieldCheck, Volume2, VolumeX } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [isAudioMuted, setIsAudioMuted] = useState(getIsMuted());
  const navigate = useNavigate();

  useEffect(() => {
    const handleMuteChange = (e) => {
      setIsAudioMuted(e.detail.isMuted);
    };
    window.addEventListener('qizzy:mute_change', handleMuteChange);
    return () => window.removeEventListener('qizzy:mute_change', handleMuteChange);
  }, []);

  const handleToggleSound = () => {
    const newMute = toggleSoundMute();
    setIsAudioMuted(newMute);
  };

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="nav-header">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <Target size={26} color="var(--secondary)" />
          <span className="nav-logo-text">Qizzy</span>
        </Link>

        <div className="nav-right">
          {/* Global Sound Control */}
          <button 
            onClick={handleToggleSound} 
            className="nav-sound-btn"
            title={isAudioMuted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label="Toggle Sound"
          >
            {isAudioMuted ? (
              <VolumeX size={17} color="#ff4757" />
            ) : (
              <Volume2 size={17} color="var(--secondary)" />
            )}
          </button>

          {isAuthenticated && (
            <div className="nav-user-info">
              <div className="nav-user-badge-group">
                <span className="nav-user-name">{user?.name}</span>
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
              <button onClick={handleLogout} className="btn btn-secondary nav-logout-btn">
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
