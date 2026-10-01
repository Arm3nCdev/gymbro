import React, { useState, useEffect, useRef } from 'react';
import { X, Flame, RefreshCw, Sparkles, MessageCircle, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import gymBroImg from '../../assets/images/gymbro_mascot_1790689082466.jpg';
import { GymMember, GymMessage } from '../../types';

interface GymBroMascotProps {
  studentName?: string;
  member?: GymMember;
  unreadMessages?: GymMessage[];
  onMarkMessageRead?: (messageId: string) => void;
}

const MOTIVATIONAL_QUOTES = [
  '¡Arriba, a ganar!',
  '¡Ganando siempre bro!',
  '¡Una repe más bro, el músculo crece cuando salís de la zona de confort!',
  '¡A hidratarse bro! El agua es combustible puro para tus músculos.',
  '¡La disciplina siempre le gana a la pereza!',
  '¡Primero dominá la técnica bro, después subí los kilos!',
  '¡Cada gota de sudor te acerca a tu mejor versión física y mental!',
  '¡El único mal entrenamiento es el que no se hace!',
  '¡Modo bestia activado! Respirá profundo, enfocate y a ganar bro.',
  '¡Sentí cómo quema ese músculo bro! Ahí es donde ocurre el cambio.',
  '¡Recordá descansar bien! El músculo se repara y crece mientras dormís.',
  '¡No te olvides de tu proteína bro, dale nutrición de calidad al cuerpo!',
  '¡Sos tu único rival bro, superá tus marcas de la semana pasada!',
  '¡Acordate que podés publicar tus logros en el apartado de fotos de la pantalla principal!',
];

const ABSENT_TEASING_QUOTES = [
  '¡Epa bro! Me contaron en recepción que hoy faltaste ¡Las mancuernas no se van a levantar solas!',
  '¿Cambiaste las pesas por delivery de pizza? ¡Vení que te estamos esperando bro!',
  '¡Avisale al sillón que afloje el abrazo tóxico! En GymBro tenemos barras cargadas esperándote.',
  'Se busca alumno para completar su rutina de hoy. ¡Recompensa: masa muscular pura!',
  '¿Escuché que hoy te tocaba día de piernas y no apareciste? Tranqui que las sentadillas no muerden',
  'Fallando bro, eso no es de masivos',
  '¡Si hoy faltas, mañana recuperamos con el doble de la rutina bro!'
];

export const GymBroMascot: React.FC<GymBroMascotProps> = ({
  studentName,
  member,
  unreadMessages = [],
  onMarkMessageRead,
}) => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [acknowledgedMsgId, setAcknowledgedMsgId] = useState<string | null>(null);
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if there is an unread absent/funny message or important notice from gym
  const unreadNotice = unreadMessages.find((m) => !m.read && m.id !== acknowledgedMsgId);

  // Build quotes pool: if student is absent, include funny absent quotes
  const isStudentAbsent = member && (member.daysAbsent > 0 || !member.todayWorkoutCompleted);
  const allQuotes = isStudentAbsent
    ? [...MOTIVATIONAL_QUOTES, ...ABSENT_TEASING_QUOTES]
    : MOTIVATIONAL_QUOTES;

  const rawQuote = allQuotes[currentQuoteIndex % allQuotes.length];
  const firstName = studentName ? studentName.trim().split(' ')[0] : '';
  const personalizedQuote = firstName
    ? rawQuote.replace(/bro/gi, firstName).replace(/campeón/gi, firstName)
    : rawQuote;

  // Auto-open cloud bubble when an unread notification arrives
  useEffect(() => {
    if (unreadNotice) {
      setIsOpen(true);
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 600);
      scheduleAutoClose(12000);
    }
  }, [unreadNotice?.id]);

  const showNextQuote = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 400);
    setCurrentQuoteIndex((prev) => (prev + 1) % allQuotes.length);
    setIsOpen(true);
    scheduleAutoClose();
  };

  const scheduleAutoClose = (duration = 9000) => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, duration);
  };

  const toggleMascot = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 450);
    if (isOpen) {
      setIsOpen(false);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    } else {
      setIsOpen(true);
      scheduleAutoClose(unreadNotice ? 12000 : 9000);
    }
  };

  const handleAcknowledgeNotification = (responsePhrase: string) => {
    if (!unreadNotice) return;
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    setAcknowledgedMsgId(unreadNotice.id);
    setReplySuccessMessage(responsePhrase);

    if (onMarkMessageRead) {
      onMarkMessageRead(unreadNotice.id);
    }

    setTimeout(() => {
      setReplySuccessMessage(null);
      scheduleAutoClose(4000);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  return (
    <div
      id="gymbro-mascot-widget"
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 pointer-events-none flex flex-col items-end select-none"
    >
      {/* Cloud Speech Bubble ("caja de mensaje como una nube") */}
      {isOpen && (
        <div className="pointer-events-auto relative mb-3 mr-2 filter drop-shadow-[0_14px_28px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200">
          {/* Fluffy Cloud Lobes around perimeter */}
          {/* Top cloud puffs */}
          <div className="absolute -top-3.5 left-7 w-12 h-12 bg-white rounded-full pointer-events-none" />
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full pointer-events-none" />
          <div className="absolute -top-4 right-8 w-13 h-13 bg-white rounded-full pointer-events-none" />

          {/* Side cloud puffs */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-10 h-10 bg-white rounded-full pointer-events-none" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-10 h-10 bg-white rounded-full pointer-events-none" />

          {/* Bottom cloud puffs */}
          <div className="absolute -bottom-3 left-8 w-11 h-11 bg-white rounded-full pointer-events-none" />
          <div className="absolute -bottom-4 right-14 w-14 h-14 bg-white rounded-full pointer-events-none" />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full pointer-events-none" />

          {/* Main Cloud Body Content */}
          <div className="relative z-10 bg-white text-neutral-900 rounded-[28px] p-4 sm:p-5 max-w-[285px] sm:max-w-[330px] border border-neutral-100/80">
            {/* If there's an active funny notification from Owner or Trainer */}
            {unreadNotice ? (
              <div className="space-y-2">
                {/* Cloud Header for Alert */}
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-200">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] shadow-sm animate-bounce">
                      🚨
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                      {unreadNotice.sender || 'Mascota GymBro'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar nube"
                    className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {replySuccessMessage ? (
                  <div className="py-2 text-center space-y-1 animate-in zoom-in duration-150">
                    <span className="text-2xl">💪🔥</span>
                    <p className="text-xs font-bold text-emerald-700">{replySuccessMessage}</p>
                    <p className="text-[10px] text-neutral-500">¡Te esperamos en el gym!</p>
                  </div>
                ) : (
                  <>
                    {/* Notice Content */}
                    <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-2.5 my-1">
                      <p className="text-[11px] font-black text-purple-900 uppercase tracking-tight mb-1 flex items-center gap-1">
                        <span>{unreadNotice.title}</span>
                      </p>
                      <p className="text-[12px] sm:text-[13px] text-neutral-800 font-bold leading-relaxed tracking-tight italic">
                        "{unreadNotice.content}"
                      </p>
                    </div>

                    {/* Quick Funny Response Buttons */}
                    <div className="pt-1">
                      <p className="text-[10px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                        Responder a GymBro:
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeNotification('¡Así se habla! Hoy entrenamos con todo bro 🔥')}
                          className="py-1.5 px-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-[10px] flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-sm"
                        >
                          <span>🏃‍♂️💨 ¡Hoy voy sí o sí!</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeNotification('¡Anotado! Mañana recuperamos doble serie 💪')}
                          className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-sm"
                        >
                          <span>🔥 ¡Mañana doble!</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Regular Motivational Speech / Absent Teasing Quote */
              <div>
                {/* Cloud Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200/80">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-lime-400 text-neutral-950 font-black text-[11px] shadow-sm">
                      💪
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-lime-700 flex items-center gap-1">
                      GymBro <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={showNextQuote}
                      title="Cambiar frase de motivación"
                      className="p-1 rounded-full text-neutral-500 hover:text-lime-700 hover:bg-neutral-100 transition-colors active:rotate-180 duration-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      title="Cerrar nube"
                      className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Motivational Speech Text */}
                <p className="text-[12px] sm:text-[13px] text-neutral-800 font-bold leading-relaxed tracking-tight italic">
                  "{personalizedQuote}"
                </p>

                {/* Cloud Footer Hint */}
                <div className="mt-2.5 pt-1.5 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
                    <span>{isStudentAbsent ? 'Recordatorio de asistencia' : 'Energía positiva'}</span>
                  </span>
                  <span className="text-[9px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                    {currentQuoteIndex + 1}/{allQuotes.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cloud Tail Bubbles leading directly down to GymBro mascot */}
          <div className="absolute -bottom-3 right-6 w-4 h-4 bg-white rounded-full pointer-events-none shadow-sm" />
          <div className="absolute -bottom-6 right-4.5 w-3 h-3 bg-white rounded-full pointer-events-none shadow-sm" />
          <div className="absolute -bottom-8.5 right-3 w-2 h-2 bg-white rounded-full pointer-events-none shadow-sm" />
        </div>
      )}

      {/* Mascot Avatar & Button */}
      <div className="pointer-events-auto relative group">
        {/* Glowing Aura Ring */}
        <div
          className={`absolute -inset-1 rounded-full blur-sm transition-opacity duration-300 animate-pulse ${
            unreadNotice
              ? 'bg-gradient-to-r from-purple-500 via-rose-500 to-amber-400 opacity-90'
              : 'bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-500 opacity-70 group-hover:opacity-100'
          }`}
        />

        {/* Mascot Character Button */}
        <button
          type="button"
          onClick={toggleMascot}
          title={isOpen ? 'Cerrar mensaje de GymBro' : '¡Toca a GymBro para motivarte!'}
          className={`relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-neutral-900 border-2 shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 active:scale-95 ${
            unreadNotice ? 'border-purple-400 ring-2 ring-purple-400/50' : 'border-lime-400'
          } ${isBouncing ? 'animate-bounce' : 'hover:scale-105'}`}
        >
          {!imgError ? (
            <img
              src={gymBroImg}
              alt="GymBro - Mascota Fitness"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center scale-105 group-hover:scale-115 transition-transform duration-300"
            />
          ) : (
            /* High Quality SVG Fallback of the Barbell Plate Character with Muscular Arms & Smile */
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full p-1"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Plate */}
              <circle cx="50" cy="50" r="42" fill="#1c1917" stroke="#a3e635" strokeWidth="3" />
              <circle cx="50" cy="50" r="32" fill="#292524" stroke="#44403c" strokeWidth="2" />
              {/* Center Ring */}
              <circle cx="50" cy="50" r="10" fill="#0c0a09" stroke="#a3e635" strokeWidth="2" />
              {/* Cheerful Eyes */}
              <circle cx="42" cy="38" r="3.5" fill="#ffffff" />
              <circle cx="43" cy="37" r="1.5" fill="#000000" />
              <circle cx="58" cy="38" r="3.5" fill="#ffffff" />
              <circle cx="59" cy="37" r="1.5" fill="#000000" />
              {/* Smiling Mouth */}
              <path
                d="M 40 44 Q 50 52 60 44"
                stroke="#a3e635"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Flexed Bicep Arms */}
              <path
                d="M 16 52 C 8 46 8 32 18 30 C 22 29 25 34 22 42"
                stroke="#a3e635"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="#292524"
              />
              <path
                d="M 84 52 C 92 46 92 32 82 30 C 78 29 75 34 78 42"
                stroke="#a3e635"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="#292524"
              />
            </svg>
          )}

          {/* Active speech or alert indicator dot */}
          {unreadNotice ? (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-neutral-900 rounded-full animate-ping" />
          ) : isOpen ? (
            <span className="absolute top-1 right-1 w-3 h-3 bg-lime-400 border-2 border-neutral-900 rounded-full animate-ping" />
          ) : null}
        </button>

        {/* Mascot Name Badge / Alert Badge */}
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-md whitespace-nowrap border ${
            unreadNotice
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
              : 'bg-neutral-950/90 text-lime-400 border-lime-400/80'
          }`}
        >
          {unreadNotice ? (
            <span className="flex items-center gap-1">
              <Bell className="w-2.5 h-2.5 fill-white" /> ¡Aviso de Falta!
            </span>
          ) : (
            <span>GymBro</span>
          )}
        </div>

        {/* First time prompt callout if closed */}
        {!isOpen && (
          <div className="absolute -top-7 right-0 bg-neutral-900/90 text-white border border-lime-400/40 text-[9px] font-medium px-2 py-0.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap flex items-center gap-1">
            <MessageCircle className="w-2.5 h-2.5 text-lime-400" />
            <span>{unreadNotice ? '¡Mensaje nuevo!' : '¡Tocame bro!'}</span>
          </div>
        )}
      </div>
    </div>
  );
};


