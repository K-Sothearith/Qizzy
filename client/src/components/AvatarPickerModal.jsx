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
  { id: 'azure', label: 'Royal Azure', gradient: 'linear-gradient(135deg, #4274D9 0%, #293681 100%)', border: '#95CCDD' },
  { id: 'ice', label: 'Ice Aqua', gradient: 'linear-gradient(135deg, #FFFFFF 0%, #D0E7E6 60%, #95CCDD 100%)', border: '#D0E7E6' },
  { id: 'sky', label: 'Sky Cyan', gradient: 'linear-gradient(135deg, #95CCDD 0%, #4274D9 100%)', border: '#95CCDD' },
  { id: 'navy', label: 'Midnight Navy', gradient: 'linear-gradient(135deg, #293681 0%, #10183b 100%)', border: '#4274D9' },
  { id: 'gold', label: 'Golden Sun', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: '#fbbf24' },
  { id: 'emerald', label: 'Emerald Mint', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: '#34d399' },
  { id: 'violet', label: 'Cosmic Violet', gradient: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)', border: '#a5b4fc' }
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
  const [selectedColor, setSelectedColor] = useState(() => {
    const validColor = COLOR_PRESETS.find(c => c.id === currentAvatar?.color);
    return validColor ? validColor.id : 'azure';
  });

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
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: '12px' }}>
      <div 
        className="glass-panel modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          maxHeight: '90vh', 
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '20px 16px',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--secondary)" />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0, fontWeight: 800 }}>
              Customize Avatar
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            aria-label="Close Avatar Picker"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Preview Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px' }}>
          <div 
            style={{ 
              width: '84px', 
              height: '84px', 
              borderRadius: '50%', 
              background: activeColorObj.gradient,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.4rem', 
              boxShadow: `0 0 24px ${activeColorObj.border}50`,
              border: `3px solid ${activeColorObj.border}`,
              marginBottom: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {selectedEmoji}
          </div>
          <button 
            type="button"
            onClick={handleRandomize} 
            className="btn btn-secondary" 
            style={{ padding: '4px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '16px' }}
          >
            <Shuffle size={13} /> Randomize
          </button>
        </div>

        {/* Emojis Grid */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>
            Select Character ({AVATAR_PRESETS.length})
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', 
            gap: '8px',
            maxHeight: '160px',
            overflowY: 'auto',
            padding: '2px 2px 6px'
          }}>
            {AVATAR_PRESETS.map((item) => {
              const isSelected = selectedEmoji === item.emoji;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEmoji(item.emoji)}
                  style={{
                    height: '46px',
                    background: isSelected ? 'rgba(66, 116, 217, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    fontSize: '1.45rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: isSelected ? '0 0 10px rgba(149, 204, 221, 0.4)' : 'none',
                    transition: 'all 0.15s ease',
                    padding: 0
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
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>
            Select Aura Glow
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {COLOR_PRESETS.map((color) => {
              const isSelected = selectedColor === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: color.gradient,
                    border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 14px rgba(255,255,255,0.7)' : 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    padding: 0
                  }}
                  title={color.label}
                >
                  {isSelected && <Check size={16} color="#ffffff" strokeWidth={3.5} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ flex: 1, padding: '10px' }} 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{ flex: 1.5, padding: '10px' }} 
            onClick={handleConfirm}
          >
            Apply Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
