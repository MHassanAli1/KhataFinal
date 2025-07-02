import { useState, useEffect, useRef } from 'react';
import './UrduKeyboard.css';

const UrduKeyboard = ({ onKeyPress, onClose }) => {
  // Basic Urdu keyboard layout
  const urduKeys = [
    ['ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ'],
    ['د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش', 'ص'],
    ['ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل'],
    ['م', 'ن', 'ں', 'و', 'ہ', 'ھ', 'ء', 'ی', 'ے', 'ۓ'],
    ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  ];

  // Special keys
  const specialKeys = [
    { key: 'Space', label: 'Space', value: ' ' },
    { key: 'Backspace', label: '⌫', value: 'backspace' },
    { key: 'Close', label: '✕', value: 'close' }
  ];
  
  // Draggable functionality
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const keyboardRef = useRef(null);
  
  // Handle mouse/touch down - start dragging
  const handleDragStart = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX && clientY) {
      setIsDragging(true);
      setDragOffset({
        x: clientX - position.x,
        y: clientY - position.y
      });
    }
  };
  
  // Handle mouse/touch move - update position while dragging
  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX && clientY) {
      e.preventDefault(); // Prevent scrolling on touch devices
      
      // Calculate new position
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      // Apply boundaries to keep keyboard on screen
      const maxX = window.innerWidth - (keyboardRef.current?.offsetWidth || 300);
      const maxY = window.innerHeight - (keyboardRef.current?.offsetHeight || 200);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };
  
  // Handle mouse/touch up - stop dragging
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Add global event listeners for drag movement and ending
  useEffect(() => {
    if (isDragging) {
      // For mouse events
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      
      // For touch events
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
    }
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isDragging, dragOffset]);

  // Handle keyboard interaction
  const handleKeyClick = (char) => {
    if (char === 'backspace') {
      onKeyPress('backspace');
    } else if (char === 'close') {
      onClose();
    } else {
      onKeyPress(char);
    }
  };

  // Allow keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className={`urdu-keyboard ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
      }}
      ref={keyboardRef}
    >
      <div 
        className="keyboard-header"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <span className="drag-handle">⋮⋮</span>
        <span>اردو کی بورڈ</span>
        <button 
          className="close-keyboard" 
          onClick={() => handleKeyClick('close')}
        >
          ✕
        </button>
      </div>

      <div className="keyboard-keys">
        {urduKeys.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="keyboard-row">
            {row.map((key) => (
              <button
                key={key}
                className="keyboard-key"
                onClick={() => handleKeyClick(key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}

        <div className="keyboard-row special-keys">
          {specialKeys.map((key) => (
            <button
              key={key.key}
              className={`keyboard-key ${key.key.toLowerCase()}`}
              onClick={() => handleKeyClick(key.value)}
            >
              {key.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UrduKeyboard;