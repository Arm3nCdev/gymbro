import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Volume2, X } from 'lucide-react';
import { playTimerBeep } from '../../utils/audio';

interface RestTimerProps {
  initialSeconds?: number;
  onClose?: () => void;
  autoStart?: boolean;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 60,
  onClose,
  autoStart = false,
}) => {
  const [targetSeconds, setTargetSeconds] = useState(initialSeconds);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setTargetSeconds(initialSeconds);
    if (autoStart) {
      setIsRunning(true);
    }
  }, [initialSeconds, autoStart]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            playTimerBeep('finish');
            setIsRunning(false);
            return 0;
          }
          if (prev <= 4 && prev > 1) {
            playTimerBeep('countdown');
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleReset = (secs: number) => {
    setTargetSeconds(secs);
    setTimeLeft(secs);
    setIsRunning(true);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent = targetSeconds > 0 ? ((targetSeconds - timeLeft) / targetSeconds) * 100 : 0;

  return (
    <div id="rest-timer-widget" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl text-neutral-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lime-400 font-semibold text-sm">
          <TimerIcon className="w-4 h-4 animate-pulse" />
          <span>Temporizador de Descanso</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5" /> Con sonido
          </span>
          {onClose && (
            <button
              onClick={onClose}
              id="btn-close-rest-timer"
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-4xl font-extrabold tracking-tight font-mono text-white">
          {formatTime(timeLeft)}
        </div>
        <div className="flex items-center gap-1.5">
          {[30, 60, 90, 120].map((secs) => (
            <button
              key={secs}
              onClick={() => handleReset(secs)}
              id={`btn-preset-${secs}s`}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                targetSeconds === secs
                  ? 'bg-lime-400 text-neutral-950 font-bold'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {secs}s
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-lime-400 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setIsRunning(!isRunning)}
          id="btn-toggle-rest-timer"
          className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            isRunning
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-lime-400 text-neutral-950 hover:bg-lime-300 shadow-md shadow-lime-400/20'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> {timeLeft === 0 ? 'Repetir' : 'Iniciar'}
            </>
          )}
        </button>
        <button
          onClick={() => {
            setTimeLeft(targetSeconds);
            setIsRunning(false);
          }}
          id="btn-reset-rest-timer"
          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          title="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
