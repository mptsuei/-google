/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, Play, RotateCcw, MousePointer2, Star, Zap } from 'lucide-react';

const GRID_SIZE = 3;
const GAME_DURATION = 30; // 30 seconds
const INITIAL_COOLDOWN = 1000;
const MIN_COOLDOWN = 500;

interface Mole {
  isUp: boolean;
  x: number;
  y: number;
  z: number;
  isCorrect: boolean;
}

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('whackAMoleHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [moles, setMoles] = useState<Mole[]>(() => 
    new Array(GRID_SIZE * GRID_SIZE).fill(null).map(() => ({
      isUp: false,
      x: 0,
      y: 0,
      z: 0,
      isCorrect: false
    }))
  );
  const [lastWhacked, setLastWhacked] = useState<number | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Game initialization
  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsActive(true);
    setMoles(new Array(GRID_SIZE * GRID_SIZE).fill(null).map(() => ({
      isUp: false,
      x: 0,
      y: 0,
      z: 0,
      isCorrect: false
    })));
  };

  const endGame = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    
    setHighScore((prev) => {
      const currentScore = score;
      if (currentScore > prev) {
        localStorage.setItem('whackAMoleHighScore', currentScore.toString());
        return currentScore;
      }
      return prev;
    });
  }, [score]);

  // Main countdown timer
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, endGame]);

  // Mole management
  const popUpMole = useCallback(() => {
    if (!isActive) return;

    // Pick a random mole that isn't currently up
    const availableIndices = moles.map((m, i) => !m.isUp ? i : -1).filter(i => i !== -1);
    if (availableIndices.length === 0) return;

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    
    // Generate math problem
    const x = Math.floor(Math.random() * 90) + 10; // 10-99
    const y = Math.floor(Math.random() * 90) + 10; // 10-99
    const isCorrect = Math.random() > 0.4; // 60% chance to be correct
    let z = x + y;
    if (!isCorrect) {
      const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      z += offset;
    }

    setMoles(prev => {
      const next = [...prev];
      next[randomIndex] = { isUp: true, x, y, z, isCorrect };
      return next;
    });

    // Mole disappears after a random duration (shorter as score increases)
    const basePopDuration = Math.max(1200, 2500 - (score * 30));
    const popDuration = basePopDuration / speedMultiplier;

    setTimeout(() => {
      setMoles(prev => {
        const next = [...prev];
        if (next[randomIndex]) {
          next[randomIndex] = { ...next[randomIndex], isUp: false };
        }
        return next;
      });
    }, popDuration);

    // Schedule next mole
    const baseNextMoleDelay = Math.max(MIN_COOLDOWN, INITIAL_COOLDOWN - (score * 15));
    const nextMoleDelay = baseNextMoleDelay / speedMultiplier;
    moleTimerRef.current = setTimeout(popUpMole, nextMoleDelay);
  }, [isActive, moles, score, speedMultiplier]);

  useEffect(() => {
    if (isActive) {
      popUpMole();
    }
    return () => {
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    };
  }, [isActive]);

  const [isShaking, setIsShaking] = useState(false);

  const whackMole = (index: number) => {
    if (!isActive || !moles[index].isUp) {
      return;
    }

    const mole = moles[index];
    if (mole.isCorrect) {
      setScore(prev => prev + 1);
    } else {
      setScore(prev => Math.max(0, prev - 2)); // Penalty for wrong choice
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }
    
    setLastWhacked(index);
    setTimeout(() => setLastWhacked(null), 300);

    setMoles(prev => {
      const next = [...prev];
      next[index] = { ...next[index], isUp: false };
      return next;
    });
  };

  return (
    <div 
      className="min-h-screen mesh-gradient text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-sky-500/30 overflow-hidden"
      id="game-root"
    >
      <div className="glass rounded-[40px] p-10 flex flex-col items-center max-w-2xl w-full shadow-2xl relative" id="main-container">
        {/* Header / Stats */}
        <div className="w-full flex flex-col gap-8 mb-10" id="stats-header">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
            <div className="flex flex-col text-center sm:text-left">
              <h1 className="text-white text-5xl font-black tracking-tighter italic">WHACK-A-MOLE</h1>
              <p className="text-sky-300 uppercase tracking-[0.3em] text-[10px] font-bold mt-1">Neon Arcade Edition</p>
            </div>
            
            <div className="flex gap-4">
              <div className="glass rounded-2xl px-6 py-3 text-center min-w-[120px]">
                <p className="text-sky-200 text-[10px] uppercase font-bold tracking-widest mb-1">SCORE</p>
                <motion.p 
                  key={score}
                  initial={{ scale: 1.2, color: "#7dd3fc" }}
                  animate={{ scale: 1, color: "#fff" }}
                  className="text-3xl font-mono font-bold"
                >
                  {score.toString().padStart(2, '0')}
                </motion.p>
              </div>
              <div className={`glass rounded-2xl px-6 py-3 text-center min-w-[120px] border-orange-500/50 ${timeLeft < 10 ? 'bg-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : ''}`}>
                <p className="text-orange-300 text-[10px] uppercase font-bold tracking-widest mb-1">TIME LEFT</p>
                <p className="text-white text-3xl font-mono font-bold">
                  {timeLeft.toString().padStart(2, '0')}s
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
             <div className="flex items-center gap-2 opacity-60">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-mono tracking-widest uppercase">Best: {highScore}</span>
             </div>

             {/* Speed Slider */}
             <div className="flex items-center gap-4 glass px-4 py-2 rounded-full min-w-[200px]">
                <Zap className={`w-3 h-3 ${speedMultiplier > 1.5 ? 'text-rose-400 animate-pulse' : 'text-sky-400'}`} />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-sky-300">Speed Multiplier</span>
                    <span className="text-[10px] font-mono font-bold">{speedMultiplier.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.5" 
                    step="0.1" 
                    value={speedMultiplier}
                    disabled={isActive}
                    onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
             </div>
          </div>
        </div>

        {/* Game Grid */}
        <div 
          className={`grid grid-cols-3 gap-6 p-8 bg-black/20 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden transition-transform duration-75 ${isShaking ? 'shake' : ''}`}
          style={{ width: 'min(100%, 480px)', height: 'min(95vw, 480px)' }}
          id="mole-grid"
        >
          {moles.map((mole, index) => (
            <div 
              key={index}
              className="relative glass-dark rounded-full overflow-hidden aspect-square border border-white/5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] group cursor-none"
              onClick={() => whackMole(index)}
              onMouseDown={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'scale(0.95)';
                setTimeout(() => target.style.transform = '', 100);
              }}
            >
              <AnimatePresence>
                {mole.isUp && (
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "15%", opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 25 
                    }}
                    className="absolute inset-x-0 bottom-0 flex justify-center"
                  >
                    <div className="w-20 h-24 bg-[#8B4513] rounded-t-full border-4 border-[#5d2e0d] shadow-lg relative flex flex-col items-center pt-2">
                       {/* Math Problem Bubble */}
                       <div className="absolute -top-1 bg-white px-2 py-0.5 rounded-full shadow-lg border border-sky-500 z-10">
                          <span className="text-[10px] font-black text-slate-800 whitespace-nowrap">
                            {mole.x}+{mole.y}={mole.z}
                          </span>
                       </div>

                      {/* Mole Face */}
                      <div className="flex gap-2 mt-4">
                         <div className="w-2 h-2 bg-black rounded-full" />
                         <div className="w-2 h-2 bg-black rounded-full" />
                      </div>
                      <div className="w-4 h-2 bg-rose-300 rounded-full mt-1" />
                      
                      {/* Whack Flash */}
                      {lastWhacked === index && (
                        <motion.div 
                          initial={{ opacity: 1, scale: 0.5 }}
                          animate={{ opacity: 0, scale: 2 }}
                          className="absolute inset-0 bg-white rounded-t-full"
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer controls */}
        <div className="mt-10 flex justify-between items-center w-full" id="footer-actions">
          <div className="flex gap-3">
             <div className="px-4 py-2 glass rounded-full text-white/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <MousePointer2 className="w-3 h-3" />
                WHACK!
             </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-none">ARCADE SYSTEM</p>
            <div className="flex gap-1.5">
               <span className="w-2 h-2 rounded-full bg-sky-400"></span>
               <span className="w-2 h-2 rounded-full bg-sky-400"></span>
               <span className="w-2 h-2 rounded-full bg-sky-400/30"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Hammer Cursor (only visually within grid area for realism) */}
      <style>{`
        #mole-grid:hover {
          cursor: crosshair;
        }
      `}</style>

      {/* Start / Overlay */}
      {!isActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
          id="game-overlay"
        >
          <div className="glass rounded-[40px] p-12 max-w-sm w-full text-center shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex flex-col items-center gap-8">
            {timeLeft === 0 ? (
              <>
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <Trophy className="w-12 h-12 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-4xl font-black italic tracking-tighter">TIME UP!</h2>
                  <p className="text-sky-300 text-xs font-bold uppercase tracking-widest leading-none">Session Complete</p>
                </div>
                
                <div className="flex flex-col gap-1 items-center bg-white/5 py-4 px-8 rounded-2xl border border-white/5 w-full">
                  <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">Final Molecules Whacked</span>
                  <span className="text-7xl font-black text-white tracking-tighter">{score}</span>
                </div>

                {score >= highScore && score > 0 && (
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="bg-sky-400 text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest"
                  >
                    New Arcade Record!
                  </motion.div>
                )}

                <button 
                  onClick={startGame}
                  className="w-full bg-white text-slate-900 font-black py-5 rounded-[20px] flex items-center justify-center gap-3 hover:scale-105 transition-all text-xl shadow-xl active:scale-95"
                  id="restart-btn"
                >
                  <RotateCcw className="w-6 h-6" />
                  RESTART
                </button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-black ml-1 fill-current" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase">Mole Math Blitz</h2>
                  <p className="text-sky-300 text-xs font-bold uppercase tracking-widest">Logic & Reflexes</p>
                </div>
                <p className="text-white/60 text-sm leading-relaxed px-4">
                  Only whack the moles with <span className="text-white font-bold tracking-widest">CORRECT</span> equations! Wrong hits deduct points.
                </p>
                <button 
                  onClick={startGame}
                  className="w-full bg-white text-slate-900 font-black py-5 rounded-[20px] flex items-center justify-center gap-3 hover:scale-105 transition-all text-xl shadow-xl active:scale-95"
                  id="start-btn"
                >
                  <Play className="w-6 h-6 fill-current" />
                  INITIALIZE
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Footer info removed as it's now integrated inside the main glass card */}
      <div className="fixed bottom-6 text-white/20 text-[10px] uppercase tracking-[0.4em] font-bold" id="version-stamp">
        PREVIEW MODE | V1.2.0
      </div>
    </div>
  );
}
