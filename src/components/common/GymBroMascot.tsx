import React, { useState, useEffect, useRef } from 'react';
import { X, Flame, RefreshCw, Sparkles } from 'lucide-react';

interface GymBroMascotProps {
  studentName?: string;
}

const MOTIVATIONAL_QUOTES = [
  '¡Arriba, a ganar!',
  '¡Ganando siempre, masivo!',
  '¡Una repe más bro, el músculo crece con la constancia!',
  '¡A hidratarse bro! El agua también suma rendimiento.',
  '¡La disciplina siempre le gana a la pereza bro!',
  '¡Primero dominá la técnica bro, luego el peso!',
  '¡Cada gota de sudor te acerca a tu mejor versión!',
  '¡El único mal entrenamiento es el que no se hace!',
  '¡Modo bestia activado! Respirá hondo y dale con todo.',
  '¡Sentí cómo quema ese músculo! Ahí empieza el cambio.',
  '¡Acordate que podes publicar tus logros en el apartado de desarrollo bro!',
];

export const GymBroMascot: React.FC<GymBroMascotProps> = ({ studentName }) => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rawQuote = MOTIVATIONAL_QUOTES[currentQuoteIndex];
  const personalizedQuote = studentName
    ? rawQuote.replace('máquina', studentName).replace('GymBro', studentName)
    : rawQuote;

  const showNextQuote = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    setIsOpen(true);
    scheduleAutoClose();
  };

  const scheduleAutoClose = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 7000);
  };

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      id="gymbro-mascot-widget"
      className="fixed bottom-16 sm:bottom-4 right-3 z-30 pointer-events-none flex flex-col items-end"
    >
      {/* Sleek, Non-Intrusive Message Toast */}
      {isOpen && (
        <div className="pointer-events-auto mb-1.5 max-w-[260px] bg-neutral-950/95 border border-lime-400/50 rounded-2xl p-2.5 shadow-xl text-neutral-100 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-neutral-800">
            <span className="text-[10px] font-black uppercase text-lime-400 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-lime-400" /> Motivación
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={showNextQuote}
                title="Siguiente frase"
                className="p-1 rounded text-neutral-400 hover:text-lime-400 hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Cerrar mensaje"
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-neutral-200 font-medium leading-relaxed">
            "{personalizedQuote}"
          </p>
        </div>
      )}

      {/* Tiny Compact Floating Badge (Takes minimal space, never blocks scroll) */}
      <div className="pointer-events-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
              scheduleAutoClose();
            }
          }}
          title="Tocar para ver frase motivacional"
          className="flex items-center gap-1.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 hover:border-lime-400/60 text-white py-1 px-2.5 rounded-full shadow-md backdrop-blur-sm transition-all text-xs active:scale-95"
        >
          <span className="text-sm">💪</span>
          <span className="text-[10px] font-black text-lime-400">GymBro</span>
          <Sparkles className="w-2.5 h-2.5 text-lime-400" />
        </button>
      </div>
    </div>
  );
};
