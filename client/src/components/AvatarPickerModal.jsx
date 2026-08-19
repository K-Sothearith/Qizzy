import { useState } from 'react';
import { X, Sparkles, Check, Shuffle } from 'lucide-react';

export const AVATAR_PRESETS = [
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'koala', emoji: '🐨', label: 'Koala' },
  { id: 'frog', emoji: '🐸', label: 'Frog' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'lightning', emoji: '⚡', label: 'Lightning' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'dragon', emoji: '🐲', label: 'Dragon' },
  { id: 'cat', emoji: '🐱', label: 'Cat' },
  { id: 'dog', emoji: '🐶', label: 'Dog' },
  { id: 'octopus', emoji: '🐙', label: 'Octopus' }
];

export const COLOR_PRESETS = [
  { id: 'caramel', label: 'Warm Caramel', gradient: 'linear-gradient(135deg, #AD8B73 0%, #8C6D58 100%)', border: '#E3CAA5' },
  { id: 'latte', label: 'Golden Latte', gradient: 'linear-gradient(135deg, #FFFBE9 0%, #E3CAA5 100%)', border: '#FFFBE9' },
  { id: 'gold', label: 'Golden Sun', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: '#fbbf24' },
  { id: 'coral', label: 'Coral Flame', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: '#f87171' },
  { id: 'emerald', label: 'Emerald Mint', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: '#34d399' },
  { id: 'sky', label: 'Ocean Sky', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', border: '#7dd3fc' },
  { id: 'violet', label: 'Cosmic Violet', gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', border: '#c084fc' }
];

export function getRandomAvatar() {
  const randomEmoji = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].emoji;
  const randomColor = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].id;
  return { emoji: randomEmoji, color: randomColor };
}

export function getAvatarColorStyle(colorId) {
  const found = COLOR_PRESETS.find(c => c.id === colorId);
  return found || COLOR_PRESETS[0];
}

export default function AvatarPickerModal({ currentAvatar, onSave, onClose }) {
  const [selectedEmoji, setSelectedEmoji] = useState(currentAvatar?.emoji || '🦊');
  const [selectedColor, setSelectedColor] = useState(currentAvatar?.color || 'sand');

  const activeColorObj = COLOR_PRESETS.find(c => c.id === selectedColor) || COLOR_PRESETS[0];

  const handleRandomize = () => {
    const random = getRandomAvatar();
    setSelectedEmoji(random.emoji);
    setSelectedColor(random.color);
  };

  const handleConfirm = () => {
    onSave({ emoji: selectedEmoji, color: selectedColor });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '480px', padding: '24px' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--secondary)" />
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>Choose Your Avatar</h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            aria-label="Close Avatar Picker"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Preview Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div 
            style={{ 
              width: '88px', 
              height: '88px', 
              borderRadius: '50%', 
              background: activeColorObj.gradient,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.4rem', 
              boxShadow: `0 0 24px ${activeColorObj.border}40`,
              border: `3px solid ${activeColorObj.border}`,
              marginBottom: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            {selectedEmoji}
          </div>
          <button 
            type="button"
            onClick={handleRandomize} 
            className="btn btn-secondary" 
            style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Shuffle size={13} /> Randomize
          </button>
        </div>

        {/* Emojis Grid */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
            Select Character
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
            {AVATAR_PRESETS.map((item) => {
              const isSelected = selectedEmoji === item.emoji;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEmoji(item.emoji)}
                  style={{
                    background: isSelected ? 'rgba(247, 241, 227, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-glass)',
                    borderRadius: '10px',
                    fontSize: '1.5rem',
                    padding: '8px 4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  title={item.label}
                >
                  {item.emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Presets */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
            Select Aura Color
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((color) => {
              const isSelected = selectedColor === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: color.gradient,
                    border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  title={color.label}
                >
                  {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ flex: 1 }} 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{ flex: 1.5 }} 
            onClick={handleConfirm}
          >
            Apply Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
