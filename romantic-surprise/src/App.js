import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// --- CONFIGURATION ---
// 1. Target Date (Year, MonthIndex 0-11, Day, Hour 0-23, Min, Sec)
// Month: 0=Jan, 1=Feb, ..., 11=Dec
// Hour: Use 24-hour format (e.g., 21 = 9 PM)
const TARGET_DATE = new Date(2025, 11, 26, 23, 55, 0).getTime();

// 2. Sound URLs (using free sound effects)
// You can replace these with your own audio files in the public folder
const SOUNDS = {
  countdown: '/sounds/countdown-tick.mp3',      // Tick sound for last 10 seconds
  heartbeat: '/sounds/heartbeat.mp3',           // Heartbeat sound
  firework: '/sounds/firework.mp3',             // Firework explosion
  romantic: '/sounds/romantic-song.mp3'         // Romantic background music
};

// 3. Photos & Messages
// Replace placeholder URLs with your actual images.
// Phrases appear when the photo grows in the center.
const MEMORIES = [
  {
    id: 1,
    url: "https://via.placeholder.com/600x800/ffb6c1/000000?text=Photo+1",
    text: "The day our eyes first met..."
  },
  {
    id: 2,
    url: "https://via.placeholder.com/600x800/ff69b4/000000?text=Photo+2",
    text: "Our first adventure together..."
  },
  {
    id: 3,
    url: "https://via.placeholder.com/600x800/87ceeb/000000?text=Photo+3",
    text: "Laughing until our stomachs hurt..."
  },
  {
    id: 4,
    url: "https://via.placeholder.com/600x800/dda0dd/000000?text=Photo+4",
    text: "Holding your hand feels like home..."
  },
  {
    id: 5,
    url: "https://via.placeholder.com/600x800/90ee90/000000?text=Photo+5",
    text: "Every moment with you is magic..."
  },
  {
    id: 6,
    url: "https://via.placeholder.com/600x800/ffdab9/000000?text=Photo+6",
    text: "Forever isn't long enough..."
  }
];

// --- APP COMPONENT ---
function App() {
  // Check if target date has already passed on initial load
  const initialPhase = new Date().getTime() >= TARGET_DATE ? 'HEART' : 'COUNTDOWN';
  const [phase, setPhase] = useState(initialPhase); // COUNTDOWN, HEART, FIREWORKS, GALLERY, FINALE
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [currentTime, setCurrentTime] = useState(new Date()); // Real-time clock
  const [galleryStep, setGalleryStep] = useState(0); // Tracks which photo is animating
  const [photosPlaced, setPhotosPlaced] = useState([]); // Tracks photos that finished moving
  const [displayedText, setDisplayedText] = useState(''); // For character-by-character animation

  const canvasRef = useRef(null);
  const loveText = "I LOVE YOU ❤️"; // The text to animate
  
  // Audio refs
  const countdownAudioRef = useRef(null);
  const heartbeatAudioRef = useRef(null);
  const fireworkAudioRef = useRef(null);
  const romanticAudioRef = useRef(null);
  const lastTickRef = useRef(-1); // Track last tick to avoid duplicate sounds
  
  // Helper function to play sound safely
  const playSound = (audioRef, options = {}) => {
    if (audioRef.current) {
      audioRef.current.volume = options.volume || 0.5;
      if (options.loop) audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };
  
  const stopSound = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // --- PHASE 1: COUNTDOWN ---
  useEffect(() => {
    if (phase !== 'COUNTDOWN') return;

    const timer = setInterval(() => {
      const now = new Date();
      const nowTime = now.getTime();
      const diff = TARGET_DATE - nowTime;

      // Update current time display
      setCurrentTime(now);

      if (diff <= 0) {
        clearInterval(timer);
        // Stop countdown tick sound immediately when countdown reaches 0
        stopSound(countdownAudioRef);
        setPhase('HEART');
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const totalSecondsLeft = Math.floor(diff / 1000);
        
        // Play countdown tick sound in last 60 seconds
        if (totalSecondsLeft <= 60 && totalSecondsLeft > 0 && totalSecondsLeft !== lastTickRef.current) {
          lastTickRef.current = totalSecondsLeft;
          playSound(countdownAudioRef, { volume: 0.7 });
        }
        
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: seconds,
        });
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      // Also stop sound when component unmounts or phase changes
      stopSound(countdownAudioRef);
    };
  }, [phase]);

  // Format current time for display
  const formatCurrentTime = () => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    };
    return currentTime.toLocaleString('en-US', options);
  };

  // --- PHASE 2 & 3: CANVAS ANIMATION (HEART & FIREWORKS) ---
  useEffect(() => {
    if (phase !== 'HEART' && phase !== 'FIREWORKS') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Track if heartbeat sound has started
    let heartbeatStarted = false;
    
    // Stop heartbeat when FIREWORKS phase begins
    if (phase === 'FIREWORKS') {
      stopSound(heartbeatAudioRef);
    }
    
    // Resize handling
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Animation Variables
    let animationFrameId;
    let startTime = null;
    let particles = [];
    let lastFireworkTime = 0; // Track firework sound timing
    
    // Heart Config
    const heartPoints = [];
    const totalPoints = 300; 
    // Generate heart path upfront
    for (let i = 0; i < totalPoints; i++) {
      const t = (Math.PI * 2 * i) / totalPoints;
      // Parametric equations
      const x = 15 * Math.pow(Math.sin(t), 3);
      const y = 12 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      heartPoints.push({ x, y });
    }

    // Fireworks Config
    const colors = ['#FF0000', '#FFFF00', '#FFFFFF', '#800080', '#FFA500', '#008000', '#0000FF', '#f73487'];
    
    const createBurst = (cx, cy, withSound = false) => {
      // Play firework sound for each explosion
      if (withSound && fireworkAudioRef.current) {
        // Create a new audio instance for each explosion so they can overlap
        const fireworkSound = new Audio(SOUNDS.firework);
        fireworkSound.volume = 0.3 + Math.random() * 0.2; // Vary volume slightly
        fireworkSound.play().catch(e => console.log('Firework sound failed:', e));
      }
      
      const count = 150 + Math.random() * 100;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          size: Math.random() * 3 + 1,
          decay: Math.random() * 0.015 + 0.005,
          gravity: 0.05
        });
      }
    };

    // Main Draw Loop
    const render = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Clear with slight fade for trails if in fireworks mode
      if (phase === 'FIREWORKS') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseScale = Math.min(canvas.width, canvas.height) / 40; // Dynamic scale

      // --- DRAW HEART ---
      if (phase === 'HEART') {
        // Draw incrementally
        const progress = Math.min(elapsed / 8000, 1); // 8 seconds to draw
        const currentPointIndex = Math.floor(progress * totalPoints);

        // Heartbeat effect - realistic double-beat pattern (lub-dub)
        // One full heartbeat cycle takes about 800ms
        const beatCycle = (elapsed % 800) / 800; // 0 to 1 over 800ms
        let beatScale = 1;
        
        if (progress >= 1) { // Only beat after heart is fully drawn
          // Start heartbeat sound when beating begins
          if (!heartbeatStarted) {
            heartbeatStarted = true;
            playSound(heartbeatAudioRef, { volume: 0.6, loop: true });
          }
          
          // First beat (lub) at 0-0.15
          if (beatCycle < 0.15) {
            beatScale = 1 + 0.12 * Math.sin(beatCycle / 0.15 * Math.PI);
          }
          // Second beat (dub) at 0.2-0.35
          else if (beatCycle >= 0.2 && beatCycle < 0.35) {
            beatScale = 1 + 0.08 * Math.sin((beatCycle - 0.2) / 0.15 * Math.PI);
          }
          // Rest period
          else {
            beatScale = 1;
          }
        }
        
        const scale = baseScale * beatScale;

        ctx.beginPath();
        ctx.lineWidth = 5 * beatScale;
        ctx.strokeStyle = '#f73487';
        ctx.shadowBlur = 20 + (beatScale - 1) * 100; // Glow more when beating
        ctx.shadowColor = '#f73487';
        ctx.lineCap = 'round';

        for (let i = 0; i < currentPointIndex; i++) {
          const px = cx + heartPoints[i].x * scale;
          const py = cy - heartPoints[i].y * scale; // Invert Y for canvas
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        
        // Fill the heart with a semi-transparent color after it's drawn
        if (progress >= 1) {
          ctx.fillStyle = `rgba(247, 52, 135, ${0.2 + (beatScale - 1) * 2})`;
          ctx.fill();
        }

        // Transition to Fireworks after heart is done + 2s pause
        if (elapsed > 10000) { 
          setPhase('FIREWORKS');
          startTime = null; // Reset time for fireworks
        }
      }

      // --- DRAW FIREWORKS ---
      if (phase === 'FIREWORKS') {
        // Still draw the heart faintly with gentle beat
        const fwBeatCycle = (elapsed % 1000) / 1000;
        const fwBeatScale = 1 + 0.05 * Math.sin(fwBeatCycle * Math.PI * 2);
        const fwScale = baseScale * fwBeatScale;
        
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(247, 52, 135, 0.3)';
        ctx.shadowBlur = 0;
        for (let i = 0; i < totalPoints; i++) {
          const px = cx + heartPoints[i].x * fwScale;
          const py = cy - heartPoints[i].y * fwScale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Launch bursts randomly from center
        if (Math.random() < 0.05) {
          createBurst(cx, cy, true);
        }
        
        // Launch bursts from bottom-left corner (shooting up-right)
        if (Math.random() < 0.03) {
          const targetX = canvas.width * 0.2 + Math.random() * canvas.width * 0.3;
          const targetY = canvas.height * 0.2 + Math.random() * canvas.height * 0.3;
          createBurst(targetX, targetY, true);
        }
        
        // Launch bursts from bottom-right corner (shooting up-left)
        if (Math.random() < 0.03) {
          const targetX = canvas.width * 0.5 + Math.random() * canvas.width * 0.3;
          const targetY = canvas.height * 0.2 + Math.random() * canvas.height * 0.3;
          createBurst(targetX, targetY, true);
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Transition to Gallery after 30 seconds
        if (elapsed > 30000) {
           setPhase('GALLERY');
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [phase]);

  // --- PHASE 4: GALLERY ORCHESTRATION ---
  useEffect(() => {
    if (phase !== 'GALLERY') return;

    // Start romantic background music for gallery
    playSound(romanticAudioRef, { volume: 0.5, loop: true });

    // Sequence logic
    // 1. Photo N starts Growing (center).
    // 2. Wait 4 seconds.
    // 3. Photo N moves to slot. Photo N+1 starts Growing immediately.
    
    let currentIdx = 0;
    const intervalTime = 5000; // Time between photos

    const nextStep = () => {
      if (currentIdx >= MEMORIES.length) {
        // All photos done, wait for final placement then trigger finale
        setTimeout(() => setPhase('FINALE'), 4000);
        return;
      }

      setGalleryStep(currentIdx); // Triggers "Growing" for currentIdx
      
      // Schedule the "Move to placed" event
      setTimeout(() => {
        setPhotosPlaced((prev) => [...prev, currentIdx]); // Adds class for placement
      }, 3500); // Move starts slightly before next one appears

      currentIdx++;
      setTimeout(nextStep, intervalTime);
    };

    // Start sequence after small delay to let canvas fade
    setTimeout(nextStep, 1000);

  }, [phase]);

  // --- PHASE 5: FINALE TEXT ANIMATION ---
  useEffect(() => {
    if (phase !== 'FINALE') return;

    let charIndex = 0;
    setDisplayedText(''); // Reset text

    const typeInterval = setInterval(() => {
      if (charIndex < loveText.length) {
        setDisplayedText(loveText.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 200); // 200ms per character

    return () => clearInterval(typeInterval);
  }, [phase, loveText]);

  // --- RENDER HELPERS ---
  
  // Calculate random-ish but pleasing positions for the final "Collection"
  // We'll arrange them in a loose heart/oval shape in the bottom/center
  const getPositionStyle = (index) => {
    const total = MEMORIES.length;
    // Simple distribution logic
    const angle = (index / total) * Math.PI * 2; // Circular
    const radius = 25; // vmin units
    // Adjust logic to keep them somewhat centered but spread
    const top = 50 + Math.sin(angle) * 15; 
    const left = 50 + Math.cos(angle) * 20; 
    
    // Add some random rotation for polaroid feel
    const rotate = (index % 2 === 0 ? 1 : -1) * (5 + index * 2);

    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-50%, -50%) scale(0.6) rotate(${rotate}deg)`,
      zIndex: 10 + index
    };
  };

  return (
    <div className="App">
      
      {/* 1. COUNTDOWN OVERLAY */}
      {phase === 'COUNTDOWN' && (
        <div className="countdown-container">
          <div className="current-time">
            <span className="time-label">Current Time:</span>
            <span className="time-value">{formatCurrentTime()}</span>
          </div>
          <h1 className="title">Countdown to Our Special Moment</h1>
          <div className="timer">
            <div className="time-box"><span>{timeLeft.d}</span>d</div>
            <div className="time-box"><span>{timeLeft.h}</span>h</div>
            <div className="time-box"><span>{timeLeft.m}</span>m</div>
            <div className="time-box"><span>{timeLeft.s}</span>s</div>
          </div>
        </div>
      )}

      {/* 2 & 3. CANVAS LAYER */}
      <canvas 
        ref={canvasRef} 
        className={`main-canvas ${phase === 'GALLERY' ? 'fade-out' : ''}`}
      />

      {/* 4. GALLERY LAYER */}
      {(phase === 'GALLERY' || phase === 'FINALE') && (
        <div className={`gallery-container ${phase === 'FINALE' ? 'final-scale-up' : ''}`}>
          {MEMORIES.map((photo, index) => {
            const isGrowing = galleryStep === index && !photosPlaced.includes(index);
            const isPlaced = photosPlaced.includes(index);
            
            // Start State: Hidden/Small Center
            // Growing State: Big Center
            // Placed State: Small Grid Position
            
            let className = 'photo-card';
            let style = {};

            if (isGrowing) {
              className += ' growing';
            } else if (isPlaced) {
              className += ' placed';
              style = getPositionStyle(index);
            } else if (index > galleryStep) {
              className += ' waiting';
            }

            return (
              <div key={photo.id} className={className} style={style}>
                <img src={photo.url} alt="Memory" />
                {isGrowing && <div className="caption">{photo.text}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. FINALE TEXT */}
      <div className={`finale-overlay ${phase === 'FINALE' ? 'visible' : ''}`}>
        <h1 className="love-text">{displayedText}<span className="cursor">|</span></h1>
        <p className="signature">by your love, Anas</p>
      </div>

      {/* AUDIO ELEMENTS */}
      <audio ref={countdownAudioRef} src={SOUNDS.countdown} preload="auto" />
      <audio ref={heartbeatAudioRef} src={SOUNDS.heartbeat} preload="auto" />
      <audio ref={fireworkAudioRef} src={SOUNDS.firework} preload="auto" />
      <audio ref={romanticAudioRef} src={SOUNDS.romantic} preload="auto" />

    </div>
  );
}

export default App;