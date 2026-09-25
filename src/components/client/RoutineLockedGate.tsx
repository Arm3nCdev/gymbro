import React, { useState } from 'react';
import {
  Lock,
  AlertCircle,
  Banknote,
  Smartphone,
  Copy,
  Check,
  CreditCard,
  MessageCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { GymMember, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, createWhatsAppLink } from '../../utils/storage';

interface RoutineLockedGateProps {
  member: GymMember;
  onNotifyPayment: (memberId: string, method: PaymentMethod, note?: string) => void;
}

export const RoutineLockedGate: React.FC<RoutineLockedGateProps> = ({
  member,
  onNotifyPayment,
}) => {
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const transferAlias = 'gymbro.fitness';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2500);
  };

  const handleSendNotification = (method: PaymentMethod, note: string) => {
    setIsNotifying(true);
    onNotifyPayment(member.id, method, note);
    setTimeout(() => {
      setIsNotifying(false);
    }, 400);
  };

  const hasPendingApproval = !!member.pendingPaymentApproval;

  const whatsappMessage = `Hola! Soy ${member.name}. Quería avisar que ya realicé el pago de mi cuota de ${member.planName} (${formatCurrency(member.planPrice)}) para que puedan confirmar mi pago y habilitar mi rutina. Muchas gracias!`;
  const whatsappUrl = createWhatsAppLink(member.phone || '+595981123456', whatsappMessage);

  return (
    <div id="routine-locked-gate" className="space-y-6 animate-in fade-in duration-300">
      {/* Big Hero Locked Notice */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl">
        {/* Glow backdrop effect */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
          {/* Animated Lock Badge */}
          <div className="relative">
            <div className="w-18 h-18 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/10">
              <Lock className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black">
              !
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 font-mono">
              Acceso Restringido a Alumnos
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Syne',sans-serif]">
              Rutina Diaria Bloqueada
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Hola <strong className="text-white">{member.name}</strong>, para acceder a tu rutina diaria de ejercicios y registrar tus series y pesos, debés tener tu cuota mensual al día.
            </p>
          </div>

          {/* Pending Details Card */}
          <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div>
                <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                  Plan Contratado
                </span>
                <span className="text-sm font-bold text-white">{member.planName}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                  Monto a Abonar
                </span>
                <span className="text-lg font-black text-amber-400">
                  {formatCurrency(member.planPrice)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-neutral-400">Vencimiento de cuota:</span>
              <span className="font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                {formatDate(member.nextDueDate)} (Vencida)
              </span>
            </div>
          </div>

          {/* If student has already notified payment, show clearly that it's in review by staff */}
          {hasPendingApproval ? (
            <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-left space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Clock className="w-5 h-5 shrink-0 animate-spin" />
                <h3 className="font-extrabold text-sm text-white">
                  Pago Notificado — En Verificación por el Gimnasio
                </h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Avisaste que realizaste el pago por{' '}
                <strong className="text-white font-bold">
                  {member.pendingPaymentApproval?.method === 'efectivo'
                    ? 'Efectivo en recepción'
                    : 'Transferencia bancaria'}
                </strong>{' '}
                ({formatDate(member.pendingPaymentApproval?.requestedAt || new Date().toISOString())}).
              </p>
              <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-xs text-neutral-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  El dueño o tu entrenador revisarán el ingreso en caja o cuenta bancaria y liberarán tu rutina a la brevedad.
                </span>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Enviar Comprobante por WhatsApp</span>
              </a>
            </div>
          ) : (
            /* Payment Methods and Notification Options */
            <div className="w-full space-y-3 text-left">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Opciones de Pago disponibles:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Cash at Reception */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">1. En Efectivo</h4>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Aboná en la recepción del gimnasio antes de comenzar tu sesión.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isNotifying}
                    onClick={() => handleSendNotification('efectivo', 'Pago en efectivo en recepción')}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Avisar que pagué en recepción</span>
                  </button>
                </div>

                {/* Option 2: Bank Transfer */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">2. Transferencia</h4>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Alias de cuenta bancaria:
                    </p>
                    <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-lg text-xs font-mono">
                      <span className="text-cyan-300 font-bold">{transferAlias}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(transferAlias)}
                        className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                      >
                        {copiedAlias ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAlias ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={isNotifying}
                      onClick={() => handleSendNotification('transferencia', 'Transferencia bancaria')}
                      className="w-full py-2 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-lime-400/20"
                    >
                      <span>Notificar que ya transferí</span>
                    </button>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all border border-neutral-800"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Adjuntar comprobante WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full pt-1">
            <span className="text-[11px] text-neutral-500 block leading-relaxed">
              🔒 <strong>Seguridad del gimnasio:</strong> Para garantizar un control real, la rutina diaria no se libera automáticamente por el alumno; se desbloquea una vez que el dueño o tu profesor confirman la recepción del cobro.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
