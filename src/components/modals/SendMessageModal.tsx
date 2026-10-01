import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, MessageCircle, Share2, Copy, Check, Smile, Heart, Dumbbell, AlertTriangle, UserCheck, Bot } from 'lucide-react';
import { GymMember, GymMessage } from '../../types';
import { createWhatsAppLink, formatCurrency } from '../../utils/storage';

export const FUNNY_ABSENT_MODES = [
  {
    id: 'pizza',
    label: '🍕 Pizza & Delivery',
    tag: 'Clásico',
    generate: (name: string, days: number) =>
      `¡Atención ${name}! 🚨 Llevás ${days > 1 ? `${days} días` : 'hoy'} sin venir al gimnasio y las mancuernas ya preguntaron si las cambiaste por el delivery de pizza 🍕😂. ¡Vení hoy que la masa muscular no se mantiene sola! Te guardamos lugar en GymBro 💪`,
  },
  {
    id: 'drama',
    label: '😭 Drama de Mancuernas',
    tag: 'Dramático',
    generate: (name: string, _days: number) =>
      `¡Alerta emocional en GymBro! 💔 Las mancuernas de 10kg están llorando en una esquina porque ${name} no vino hoy. Dicen que ya no las querés... ¡Vení a darles un poco de cariño con unas buenas repeticiones! 🏋️‍♂️😂`,
  },
  {
    id: 'search',
    label: '🕵️‍♂️ Se Busca (Interpol)',
    tag: 'Detective',
    generate: (name: string, _days: number) =>
      `🚨 INFORME DE INTELIGENCIA GYMBRO: Se busca a ${name}. Último avistamiento conocido: comiendo en el sillón viendo series. Recompensa: 1 serie extra de sentadillas al fallo. ¡Reportate en el gimnasio de inmediato bro! 👀🔍`,
  },
  {
    id: 'bed',
    label: '🛌 Cama Tóxica',
    tag: 'Sarcástico',
    generate: (name: string, _days: number) =>
      `Hola ${name} 👋 Te habla tu conciencia (a través de GymBro): Decile a las frazadas y al sillón que aflojen el abrazo tóxico 😂. En el gimnasio te esperan barras cargadas y mucha energía. ¡Ponete las zapatillas y vení ya! 👟⚡`,
  },
  {
    id: 'legs',
    label: '🦵 ¿Miedo a Piernas?',
    tag: 'Picante',
    generate: (name: string, _days: number) =>
      `¡Epa ${name}! ¿Acaso me enteré que hoy tocaba día de piernas y por arte de magia te dio amnesia? 😂 Tranqui, las sentadillas prometen no morder tan fuerte. ¡Vení a entrenar que no mordemos! 🔥🏋️`,
  },
  {
    id: 'terminator',
    label: '🦾 GymBro Terminator',
    tag: 'Acción',
    generate: (name: string, _days: number) =>
      `Hasta la vista... ¡a la pereza! 🤖 Mascota GymBro activó el protocolo de búsqueda: ${name} faltó hoy y las calorías están festejando en su casa. ¡No les des el gusto y vení a entrenar ahora mismo! 💥💪`,
  },
  {
    id: 'coach',
    label: '👑 Reclamo del Profe',
    tag: 'Directo',
    generate: (name: string, _days: number) =>
      `¡Hola ${name}! Acá tu profe te estuvo buscando por toda la sala de pesas y no encontramos ni tu sombra 😂. ¿Dónde quedó la promesa de ponerse fuerte? ¡Vení hoy o mañana te tocan 50 burpees de castigo! 😈💪`,
  },
  {
    id: 'couch',
    label: '🦹 Secuestro del Sillón',
    tag: 'Humor',
    generate: (name: string, _days: number) =>
      `¡SOS ${name}! 🦹 Nos informan que estás siendo rehén de tu sillón. La Mascota GymBro ya preparó un rescate de pesas rusas y discos para liberarte. ¡Parate de ahí y vení a entrenar! 🚨😂`,
  },
];

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GymMember[];
  selectedMemberId?: string;
  initialType?: 'payment_reminder' | 'workout_reminder' | 'absent_funny' | 'support_motivational';
  initialFunnyMode?: string;
  senderRole?: 'owner' | 'trainer' | 'mascot';
  senderName?: string;
  onSendMessage: (memberId: string, message: GymMessage) => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  initialType = 'workout_reminder',
  initialFunnyMode = 'pizza',
  senderRole = 'owner',
  senderName,
  onSendMessage,
}) => {
  const safeMembers = Array.isArray(members) ? members : [];
  const [memberId, setMemberId] = useState(selectedMemberId || (safeMembers[0]?.id || ''));
  const currentMember = safeMembers.find((m) => m.id === memberId) || safeMembers[0] || null;

  const [messageType, setMessageType] = useState<'payment_reminder' | 'workout_reminder' | 'absent_funny' | 'support_motivational'>(initialType);
  const [selectedFunnyMode, setSelectedFunnyMode] = useState<string>(initialFunnyMode);
  const [selectedSender, setSelectedSender] = useState<'owner' | 'trainer' | 'mascot'>(senderRole);
  const [messageText, setMessageText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customContext, setCustomContext] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  // Sync member or initialType when modal opens
  useEffect(() => {
    if (selectedMemberId) {
      setMemberId(selectedMemberId);
    }
    setMessageType(initialType);
    if (initialFunnyMode) {
      setSelectedFunnyMode(initialFunnyMode);
    }
    if (senderRole) {
      setSelectedSender(senderRole);
    }
    setSentNotice(false);
  }, [selectedMemberId, initialType, initialFunnyMode, senderRole, isOpen]);

  // Generate default template whenever type, member or funnyMode changes
  useEffect(() => {
    if (!currentMember) return;
    setSentNotice(false);

    if (messageType === 'payment_reminder') {
      const methodText = currentMember.paymentMethod === 'efectivo'
        ? 'en efectivo en la recepción del gimnasio'
        : 'por transferencia bancaria';
      setMessageText(
        `¡Hola ${currentMember.name}! 👋 Te escribo desde GymBro para recordarte con buena onda que tu cuota de ${formatCurrency(currentMember.planPrice)} vence pronto. Podés abonarla ${methodText}. ¡Avisanos cualquier consulta y nos vemos en la sala de pesas! 💪`
      );
    } else if (messageType === 'workout_reminder') {
      setMessageText(
        `¡Arriba ${currentMember.name}! ⚡ Hoy tenés tu sesión de entrenamiento programada en GymBro. La disciplina de hoy es el orgullo de mañana. ¡Te esperamos para meterle pata! 🔥🏋️‍♂️`
      );
    } else if (messageType === 'absent_funny') {
      const days = currentMember.daysAbsent || 1;
      const modeObj = FUNNY_ABSENT_MODES.find((m) => m.id === selectedFunnyMode) || FUNNY_ABSENT_MODES[0];
      setMessageText(modeObj.generate(currentMember.name, days));
    } else if (messageType === 'support_motivational') {
      setMessageText(
        `Hola ${currentMember.name}, paso a dejarte un abrazo grande de parte de todo el equipo de GymBro 💛 Sabemos que hay días donde el cuerpo o la mente piden un respiro. Si hoy te sentís cansado/a o con poca energía, vení a hacer movilidad suave o simplemente descansá sin culpa. ¡Acá estamos siempre para apoyarte!`
      );
    }
  }, [messageType, selectedFunnyMode, memberId]);

  if (!isOpen || !currentMember) return null;

  const handleSelectFunnyMode = (modeId: string) => {
    setSelectedFunnyMode(modeId);
    const days = currentMember.daysAbsent || 1;
    const modeObj = FUNNY_ABSENT_MODES.find((m) => m.id === modeId);
    if (modeObj) {
      setMessageText(modeObj.generate(currentMember.name, days));
    }
  };

  const handleGenerateAi = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: messageType,
          clientName: currentMember.name,
          daysAbsent: currentMember.daysAbsent,
          paymentStatus: currentMember.paymentStatus,
          paymentMethod: currentMember.paymentMethod,
          amount: currentMember.planPrice,
          mood: currentMember.todayMood,
          customContext: customContext.trim(),
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessageText(data.message);
      }
    } catch (err) {
      console.error('Error generating AI message:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToApp = () => {
    const titles = {
      payment_reminder: 'Aviso de Cuota GymBro 💳',
      workout_reminder: 'Recordatorio de Entrenamiento 🔥',
      absent_funny: '🚨 ¡Mascota GymBro te busca! 😂',
      support_motivational: 'Mensaje de apoyo de tu Coach 💛',
    };

    let displaySender = 'Gimnasio GymBro';
    if (selectedSender === 'mascot') {
      displaySender = 'Mascota GymBro';
    } else if (selectedSender === 'trainer') {
      displaySender = senderName ? `Profesor ${senderName}` : 'Profesor de GymBro';
    } else if (selectedSender === 'owner') {
      displaySender = senderName ? `Dueño (${senderName})` : 'Dueño del Gimnasio';
    }

    const newMsg: GymMessage = {
      id: `msg_${Date.now()}`,
      type: messageType,
      title: titles[messageType],
      content: messageText,
      date: 'Hoy',
      sender: displaySender,
      senderRole: selectedSender,
      funnyMode: messageType === 'absent_funny' ? selectedFunnyMode : undefined,
      read: false,
    };

    onSendMessage(currentMember.id, newMsg);
    setSentNotice(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const whatsappUrl = createWhatsAppLink(currentMember.phone, messageText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="send-message-modal"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Enviar Mensaje / Notificación</h2>
              <p className="text-xs text-neutral-400">La Mascota GymBro notificará al alumno en su portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-send-message"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Member Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Destinatario
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              id="select-message-recipient"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.phone} ({m.daysAbsent > 0 ? `🚨 ${m.daysAbsent} días ausente` : '🔥 Activo hoy'})
                </option>
              ))}
            </select>
          </div>

          {/* Message Type Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Tipo de Mensaje
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMessageType('absent_funny')}
                id="tab-msg-absent"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'absent_funny'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 ring-2 ring-purple-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Smile className="w-4 h-4 text-purple-400" />
                <span className="font-bold">Gracioso / Falta</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageType('workout_reminder')}
                id="tab-msg-workout"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'workout_reminder'
                    ? 'bg-lime-400/15 border-lime-400 text-lime-300 ring-2 ring-lime-400/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Dumbbell className="w-4 h-4 text-lime-400" />
                <span>Entrenamiento</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageType('payment_reminder')}
                id="tab-msg-payment"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'payment_reminder'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Pago Cuota</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageType('support_motivational')}
                id="tab-msg-support"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'support_motivational'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Motivación</span>
              </button>
            </div>
          </div>

          {/* Funny Absence Modes (Distintos Modos de Mensajitos Graciosos) */}
          {messageType === 'absent_funny' && (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-purple-400" />
                  Elegí el estilo de broma para la Mascota GymBro:
                </span>
                <span className="text-[10px] text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded-full font-semibold">
                  8 Modos cómicos
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {FUNNY_ABSENT_MODES.map((mode) => {
                  const isSelected = selectedFunnyMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleSelectFunnyMode(mode.id)}
                      className={`px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-all flex flex-col gap-0.5 border ${
                        isSelected
                          ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30 scale-[1.02]'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-purple-500/40 hover:bg-neutral-850'
                      }`}
                    >
                      <span className="font-bold text-[11px] truncate">{mode.label}</span>
                      <span className={`text-[9px] ${isSelected ? 'text-purple-200' : 'text-neutral-500'}`}>
                        {mode.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sender Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Firmar mensaje como:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedSender('mascot')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedSender === 'mascot'
                    ? 'bg-lime-400/15 border-lime-400 text-lime-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Mascota GymBro</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSender('owner')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedSender === 'owner'
                    ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>El Dueño 👑</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSender('trainer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedSender === 'trainer'
                    ? 'bg-cyan-400/15 border-cyan-400 text-cyan-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>El Profesor 📋</span>
              </button>
            </div>
          </div>

          {/* AI Generator Helper Bar */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-neutral-300 w-full sm:w-auto">
              <Sparkles className="w-4 h-4 text-lime-400 flex-shrink-0 animate-pulse" />
              <span>Personalizar o redactar con Asistente Inteligente:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <input
                type="text"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Detalle opcional (ej: le dio pereza)..."
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-lime-400 flex-1 sm:w-48"
              />
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={loadingAi}
                id="btn-ai-generate-msg"
                className="px-3 py-1 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-lime-400/20 whitespace-nowrap"
              >
                {loadingAi ? 'Generando...' : 'Reescribir con IA'}
              </button>
            </div>
          </div>

          {/* Editable Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Texto del Mensaje (Podés editarlo a tu gusto)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                id="btn-copy-msg-text"
                className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              id="textarea-message-content"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-lime-400 leading-relaxed font-sans"
            />
          </div>

          {sentNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4" />
              ¡Notificación enviada! La Mascota GymBro se lo comunicará a {currentMember.name} en su portal de forma graciosa 😂.
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-send-whatsapp-action"
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Share2 className="w-4 h-4" /> Enviar por WhatsApp
            </a>
            <button
              type="button"
              onClick={handleSendToApp}
              id="btn-send-app-notification"
              className="py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20"
            >
              <Send className="w-4 h-4" /> Notificar con Mascota en App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

