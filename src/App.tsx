/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 160;
const MIN_SPEED = 50;
const SPEED_STEP = 5; // Speed increase every level

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type FoodType = 'NORMAL' | 'GOLDEN';

interface Food extends Point {
  type: FoodType;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState<Food>({ x: 5, y: 5, type: 'NORMAL' });
  const [direction, setDirection] = useState<Direction>('UP');
  const [nextDirection, setNextDirection] = useState<Direction>('UP');
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('retro-snake-high-score');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('retro-snake-high-score', score.toString());
    }
  }, [score, highScore]);

  // Level calculation
  useEffect(() => {
    const newLevel = Math.floor(score / 50) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
    }
  }, [score, level]);

  const generateFood = useCallback((currentSnake: Point[]): Food => {
    let newPos: Point;
    while (true) {
      newPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = currentSnake.some(s => s.x === newPos.x && s.y === newPos.y);
      if (!onSnake) break;
    }
    // 10% chance for golden apple
    const type: FoodType = Math.random() < 0.1 ? 'GOLDEN' : 'NORMAL';
    return { ...newPos, type };
  }, []);

  const resetGame = () => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    setSnake(initialSnake);
    setDirection('UP');
    setNextDirection('UP');
    setScore(0);
    setLevel(1);
    setFood(generateFood(initialSnake));
    setGameState('PLAYING');
    lastUpdateTimeRef.current = performance.now();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowUp': if (direction !== 'DOWN') setNextDirection('UP'); break;
      case 'ArrowDown': if (direction !== 'UP') setNextDirection('DOWN'); break;
      case 'ArrowLeft': if (direction !== 'RIGHT') setNextDirection('LEFT'); break;
      case 'ArrowRight': if (direction !== 'LEFT') setNextDirection('RIGHT'); break;
      case ' ':
        if (gameState === 'PLAYING') setGameState('PAUSED');
        else if (gameState === 'PAUSED') setGameState('PLAYING');
        else if (gameState === 'START' || gameState === 'GAME_OVER') resetGame();
        break;
    }
  }, [direction, gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      setDirection(nextDirection);
      switch (nextDirection) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('GAME_OVER');
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        setGameState('GAME_OVER');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        const points = food.type === 'GOLDEN' ? 50 : 10;
        setScore(s => s + points);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [nextDirection, food, generateFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (Subtle CRT scanlines)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
    }

    // Food
    const fx = food.x * cellSize + cellSize / 2;
    const fy = food.y * cellSize + cellSize / 2;
    const fr = cellSize / 2.5;

    ctx.shadowBlur = 15;
    ctx.shadowColor = food.type === 'GOLDEN' ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = food.type === 'GOLDEN' ? '#fbbf24' : '#ef4444';
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((seg, i) => {
      const x = seg.x * cellSize;
      const y = seg.y * cellSize;
      
      const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      if (i === 0) {
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#059669');
      } else {
        grad.addColorStop(0, '#34d399');
        grad.addColorStop(1, '#10b981');
      }

      ctx.fillStyle = grad;
      if (i === 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
      }
      
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [snake, food]);

  const update = useCallback((time: number) => {
    if (gameState === 'PLAYING') {
      const currentSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (level - 1) * SPEED_STEP);
      if (time - lastUpdateTimeRef.current > currentSpeed) {
        moveSnake();
        lastUpdateTimeRef.current = time;
      }
    }
    draw();
    gameLoopRef.current = requestAnimationFrame(update);
  }, [gameState, level, moveSnake, draw]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(update);
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [update]);

  return (
    <div className="min-h-screen bg-black text-emerald-500 flex flex-col items-center justify-center p-4 font-mono overflow-hidden">
      {/* CRT Overlay Effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-emerald-900 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-widest uppercase">Retro Snake</h1>
            <div className="flex items-center gap-4 text-xs mt-1">
              <span className="bg-emerald-900/30 px-2 py-0.5 rounded">LVL {level}</span>
              <div className="flex items-center gap-1 text-amber-500">
                <Trophy size={12} />
                <span>HI {highScore}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black">{score.toString().padStart(4, '0')}</div>
          </div>
        </div>

        {/* Game Board */}
        <div className="relative aspect-square w-full bg-[#050505] rounded-lg overflow-hidden border-4 border-emerald-900/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <canvas ref={canvasRef} width={400} height={400} className="w-full h-full" />

          <AnimatePresence>
            {gameState === 'START' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center">
                <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tighter">INSERT COIN</h2>
                    <p className="text-emerald-700 text-xs uppercase tracking-widest">Use arrows to move • Space to start</p>
                  </div>
                  <button onClick={resetGame} className="px-12 py-4 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-black transition-all font-bold tracking-widest text-lg">
                    START GAME
                  </button>
                </motion.div>
              </motion.div>
            )}

            {gameState === 'PAUSED' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="space-y-4 text-center">
                  <Pause size={48} className="mx-auto animate-pulse" />
                  <h2 className="text-2xl font-bold uppercase">Paused</h2>
                  <button onClick={() => setGameState('PLAYING')} className="text-xs border border-emerald-500 px-4 py-1 hover:bg-emerald-500 hover:text-black">RESUME</button>
                </div>
              </motion.div>
            )}

            {gameState === 'GAME_OVER' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-8 text-center">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-8">
                  <h2 className="text-5xl font-black text-red-500 tracking-tighter uppercase italic">Game Over</h2>
                  <div className="space-y-1">
                    <p className="text-red-900 uppercase text-[10px] font-bold tracking-[0.3em]">Final Score</p>
                    <p className="text-5xl font-black text-white">{score}</p>
                  </div>
                  <button onClick={resetGame} className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold hover:bg-emerald-500 transition-colors">
                    <RotateCcw size={20} />
                    RETRY
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden grid grid-cols-3 gap-2 max-w-[200px] mx-auto pt-4">
          <div />
          <button className="w-14 h-14 border-2 border-emerald-900 rounded-xl flex items-center justify-center active:bg-emerald-500 active:text-black transition-colors" onClick={() => direction !== 'DOWN' && setNextDirection('UP')}><ArrowUp /></button>
          <div />
          <button className="w-14 h-14 border-2 border-emerald-900 rounded-xl flex items-center justify-center active:bg-emerald-500 active:text-black transition-colors" onClick={() => direction !== 'RIGHT' && setNextDirection('LEFT')}><ArrowLeft /></button>
          <button className="w-14 h-14 border-2 border-emerald-900 rounded-xl flex items-center justify-center active:bg-emerald-500 active:text-black transition-colors" onClick={() => direction !== 'UP' && setNextDirection('DOWN')}><ArrowDown /></button>
          <button className="w-14 h-14 border-2 border-emerald-900 rounded-xl flex items-center justify-center active:bg-emerald-500 active:text-black transition-colors" onClick={() => direction !== 'LEFT' && setNextDirection('RIGHT')}><ArrowRight /></button>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-8 text-[10px] text-emerald-900 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
            <span>Apple (+10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
            <span>Golden (+50)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
