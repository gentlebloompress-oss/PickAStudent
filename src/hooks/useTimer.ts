import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerHandle {
  remaining: number;       // ms left
  duration: number;        // ms total
  progress: number;        // 0..1, drains from 1 to 0
  running: boolean;
  start: (durationMs?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  add: (deltaMs: number) => void;
  stop: () => void;
}

/**
 * RAF-driven countdown. Lightweight and pause/resume-safe. Fires onComplete
 * exactly once per run (cleared if reset/start before completion).
 */
export function useTimer(onComplete?: () => void): TimerHandle {
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  const startRef = useRef(0);
  const remainingAtPauseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const tick = useCallback(() => {
    const elapsed = performance.now() - startRef.current;
    const left = Math.max(0, remainingAtPauseRef.current - elapsed);
    setRemaining(left);
    if (left <= 0) {
      setRunning(false);
      rafRef.current = null;
      completeRef.current?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback((durationMs?: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const d = durationMs ?? duration;
    setDuration(d);
    setRemaining(d);
    remainingAtPauseRef.current = d;
    startRef.current = performance.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, tick]);

  const pause = useCallback(() => {
    if (!running) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const elapsed = performance.now() - startRef.current;
    remainingAtPauseRef.current = Math.max(0, remainingAtPauseRef.current - elapsed);
    setRemaining(remainingAtPauseRef.current);
    setRunning(false);
  }, [running]);

  const resume = useCallback(() => {
    if (running || remainingAtPauseRef.current <= 0) return;
    startRef.current = performance.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [running, tick]);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setRemaining(duration);
    remainingAtPauseRef.current = duration;
    startRef.current = performance.now();
    setRunning(false);
  }, [duration]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setRemaining(0);
    setDuration(0);
    remainingAtPauseRef.current = 0;
    setRunning(false);
  }, []);

  const add = useCallback((deltaMs: number) => {
    if (running) {
      const elapsed = performance.now() - startRef.current;
      const left = Math.max(0, remainingAtPauseRef.current - elapsed) + deltaMs;
      remainingAtPauseRef.current = left;
      startRef.current = performance.now();
      setRemaining(left);
    } else {
      remainingAtPauseRef.current = Math.max(0, remainingAtPauseRef.current + deltaMs);
      setRemaining(remainingAtPauseRef.current);
    }
    setDuration((d) => Math.max(d, remainingAtPauseRef.current));
  }, [running]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const progress = duration > 0 ? remaining / duration : 0;
  return { remaining, duration, progress, running, start, pause, resume, reset, add, stop };
}
