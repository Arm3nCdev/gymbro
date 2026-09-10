import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, MessageCircle, Share2, Copy, Check, Smile, Heart, Dumbbell, AlertTriangle } from 'lucide-react';
import { GymMember, GymMessage } from '../../types';
import { createWhatsAppLink, formatCurrency } from '../../utils/storage';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GymMember[];
  selectedMemberId?: string;
  initialType?: 'payment_reminder' | 'workout_reminder' | 'absent_funny' | 'support_motivational';
  onSendMessage: (memberId: string, message: GymMessage) => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  initialType = 'workout_reminder',
  onSendMessage,
}) => {
  const safeMembers = Array.isArray(members) ? members : [];
  const [memberId, setMemberId] = useState(selectedMemberId || (safeMembers[0]?.id || ''));
  const currentMember = safeMembers.find((m) => m.id === memberId) || safeMembers[0] || null;

  const [messageType, setMessageType] = useState<'payment_reminder' | 'workout_reminder' | 'absent_funny' | 'support_motivational'>(initialType);
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
    setSentNotice(false);
  }, [selectedMemberId, initialType, isOpen]);

  // Generate default template whenever type or member changes
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
      const days = currentMember.daysAbsent || 3;
      setMessageText(
        `¡Atención ${currentMember.name}! 🚨 Llevás ${days} días sin venir al gimnasio y las mancuernas ya preguntaron si las cambiaste por el delivery de pizza 🍕😂. ¡Vení hoy que la masa muscular no se mantiene sola! Te guardamos lugar en GymBro 💪`
      );
    } else if (messageType === 'support_motivational') {
      setMessageText(
        `Hola ${currentMember.name}, paso a dejarte un abrazo grande de parte de todo el equipo de GymBro 💛 Sabemos que hay días donde el cuerpo o la mente piden un respiro. Si hoy te sentís cansado/a o con poca energía, vení a hacer movilidad suave o simplemente descansá sin culpa. ¡Acá estamos siempre para apoyarte!`
      );
    }
  }, [messageType, memberId]);

  if (!isOpen || !currentMember) return null;

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
      absent_funny: '¡Te extrañamos en el gym! 🍕😂',
      support_motivational: 'Mensaje de apoyo de tu Coach 💛',
    };

    const newMsg: GymMessage = {
      id: `msg_${Date.now()}`,
      type: messageType,
      title: titles[messageType],
      content: messageText,
      date: 'Hoy',
      sender: 'Gimnasio GymBro',
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
              <p className="text-xs text-neutral-400">Recordatorios, mensajes divertidos y de apoyo</p>
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
                  {m.name} — {m.phone} ({m.daysAbsent > 0 ? `${m.daysAbsent} días ausente` : 'Activo'})
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
                onClick={() => setMessageType('payment_reminder')}
                id="tab-msg-payment"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'payment_reminder'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Pago Cuota</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageType('workout_reminder')}
                id="tab-msg-workout"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'workout_reminder'
                    ? 'bg-lime-400/15 border-lime-400 text-lime-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Dumbbell className="w-4 h-4 text-lime-400" />
                <span>Entrenamiento</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageType('absent_funny')}
                id="tab-msg-absent"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'absent_funny'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Smile className="w-4 h-4 text-purple-400" />
                <span>Gracioso / Falta</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageType('support_motivational')}
                id="tab-msg-support"
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center ${
                  messageType === 'support_motivational'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Motivación</span>
              </button>
            </div>
          </div>

          {/* AI Generator Helper Bar */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-neutral-300 w-full sm:w-auto">
              <Sparkles className="w-4 h-4 text-lime-400 flex-shrink-0 animate-pulse" />
              <span>Personalizar o redactar con IA (Gemini):</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <input
                type="text"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Detalle opcional (ej: le duele el codo)..."
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
                Texto del Mensaje
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
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              ¡Notificación enviada a la bandeja de {currentMember.name}!
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
              <Send className="w-4 h-4" /> Notificar en App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
