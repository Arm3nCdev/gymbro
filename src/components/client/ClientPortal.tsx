import React, { useState } from 'react';
import { Dumbbell, Scale, Image as ImageIcon, MessageSquare, CreditCard, Flame, Bell, Banknote, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { DailyWorkout, GymMember, ProgressPhoto, WeightMetric } from '../../types';
import { WorkoutSession } from './WorkoutSession';
import { WeightTracker } from './WeightTracker';
import { PhotoGallery } from './PhotoGallery';
import { formatCurrency, formatDate } from '../../utils/storage';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface ClientPortalProps {
  currentMember: GymMember;
  allMembers: GymMember[];
  onSelectMember: (memberId: string) => void;
  onUpdateWorkout: (routineId: string, updatedWorkout: DailyWorkout) => void;
  onCompleteWorkout: () => void;
  onUpdateMood: (mood: 'energia' | 'cansado' | 'desmotivado' | 'adolorido') => void;
  onAddWeight: (weight: WeightMetric) => void;
  onAddPhoto: (photo: ProgressPhoto) => void;
  onMarkMessagesRead: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  currentMember,
  allMembers,
  onSelectMember,
  onUpdateWorkout,
  onCompleteWorkout,
  onUpdateMood,
  onAddWeight,
  onAddPhoto,
  onMarkMessagesRead,
}) => {
  const [activeTab, setActiveTab] = useState<'workout' | 'weight' | 'photos' | 'messages' | 'membership'>('workout');

  if (!currentMember) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <p className="text-neutral-400 text-sm">No se encontró ningún socio seleccionado.</p>
      </div>
    );
  }

  const safeMessages = Array.isArray(currentMember.messages) ? currentMember.messages : [];
  const safeWeights = Array.isArray(currentMember.weightHistory) ? currentMember.weightHistory : [];
  const safePhotos = Array.isArray(currentMember.photos) ? currentMember.photos : [];

  const unreadMessagesCount = safeMessages.filter((m) => !m.read).length;
  const isPending = currentMember.paymentStatus === 'pendiente';
  const isCash = currentMember.paymentMethod === 'efectivo';
  const latestWeight = safeWeights.length > 0 ? safeWeights[safeWeights.length - 1]?.weightKg : 75;

  const handleSwitchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'messages' && unreadMessagesCount > 0) {
      onMarkMessagesRead();
    }
  };

  return (
    <div id="client-portal-view" className="max-w-4xl mx-auto space-y-6">
      {/* Mobile-Friendly Profile & Switcher Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <img
            src={currentMember.avatar}
            alt={currentMember.name}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-2xl object-cover border-2 border-lime-400/40"
          />
          <div className="min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-white text-base truncate">{currentMember.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-400 text-[10px] font-bold">
                Atleta GymBro
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate">
              {currentMember.planName} • Meta: {currentMember.goal}
            </p>
          </div>
        </div>

        {/* Switch Athlete Selector (For testing different trainees) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs text-neutral-400 whitespace-nowrap">Cambiar alumno:</label>
          <select
            value={currentMember.id}
            onChange={(e) => onSelectMember(e.target.value)}
            id="select-athlete-switcher"
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-lime-400 cursor-pointer"
          >
            {allMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.paymentStatus === 'al_dia' ? '🟢 Al día' : '🔴 Debe cuota'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Direct App Install Banner for Athletes */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center font-black shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">¿Entrenas todos los días?</h4>
            <p className="text-[11px] text-neutral-400">
              Instala la app en la pantalla de inicio de tu celular para abrir tu rutina al instante y sin conexión.
            </p>
          </div>
        </div>
        <PWAInstallButton variant="button" className="shrink-0" />
      </div>

      {/* Trainee Navigation Pills */}
      <div className="grid grid-cols-5 gap-1.5 bg-neutral-900/80 p-1.5 rounded-2xl border border-neutral-800 text-xs font-bold">
        <button
          onClick={() => handleSwitchTab('workout')}
          id="trainee-tab-workout"
          className={`py-2.5 px-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === 'workout'
              ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Rutina</span>
        </button>

        <button
          onClick={() => handleSwitchTab('weight')}
          id="trainee-tab-weight"
          className={`py-2.5 px-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === 'weight'
              ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Peso</span>
        </button>

        <button
          onClick={() => handleSwitchTab('photos')}
          id="trainee-tab-photos"
          className={`py-2.5 px-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === 'photos'
              ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Fotos</span>
        </button>

        <button
          onClick={() => handleSwitchTab('messages')}
          id="trainee-tab-messages"
          className={`py-2.5 px-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'messages'
              ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Avisos</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 sm:top-1 sm:right-2 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-black">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleSwitchTab('membership')}
          id="trainee-tab-membership"
          className={`py-2.5 px-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === 'membership'
              ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cuota</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'workout' && (
        <WorkoutSession
          member={currentMember}
          onUpdateWorkout={onUpdateWorkout}
          onCompleteWorkout={onCompleteWorkout}
          onUpdateMood={onUpdateMood}
        />
      )}

      {activeTab === 'weight' && (
        <WeightTracker
          weightHistory={safeWeights}
          onAddWeight={onAddWeight}
        />
      )}

      {activeTab === 'photos' && (
        <PhotoGallery
          photos={safePhotos}
          currentWeight={latestWeight}
          onAddPhoto={onAddPhoto}
        />
      )}

      {activeTab === 'messages' && (
        <div id="trainee-messages-inbox" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-lime-400" />
              Notificaciones y Mensajes de tu Gimnasio
            </h3>
            <span className="text-xs text-neutral-400">
              {safeMessages.length} mensajes
            </span>
          </div>

          <div className="space-y-3">
            {safeMessages.map((msg) => {
              const isPayment = msg.type === 'payment_reminder';
              const isAbsent = msg.type === 'absent_funny';
              const isSupport = msg.type === 'support_motivational';

              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPayment
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isAbsent
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : isSupport
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {isPayment ? '💳' : isAbsent ? '🍕' : isSupport ? '💛' : '⚡'}
                      </span>
                      <h4 className="font-bold text-sm text-white">{msg.title}</h4>
                    </div>
                    <span className="text-[11px] text-neutral-500">{msg.date}</span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-2 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Enviado por: <strong className="text-neutral-300">{msg.sender}</strong></span>
                    <span className="text-lime-400 font-semibold">GymBro Oficial</span>
                  </div>
                </div>
              );
            })}

            {currentMember.messages.length === 0 && (
              <div className="p-8 text-center text-xs text-neutral-400">
                No tenés mensajes pendientes. ¡Seguí así!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'membership' && (
        <div id="trainee-membership-view" className="space-y-5">
          {/* Status Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Estado de tu Membresía
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">
                  {currentMember.planName}
                </h3>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isPending
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {isPending ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isPending ? 'Cuota Pendiente' : 'Cuota Al Día'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
                  Valor Cuota
                </span>
                <span className="text-lg font-black text-lime-400 mt-0.5 block">
                  {formatCurrency(currentMember.planPrice)}
                </span>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
                  Método de Pago
                </span>
                <span className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                  {isCash ? <Banknote className="w-4 h-4 text-emerald-400" /> : <Smartphone className="w-4 h-4 text-cyan-400" />}
                  {isCash ? 'Efectivo en recepción' : 'Transferencia bancaria'}
                </span>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
                  Próximo Vencimiento
                </span>
                <span className="text-sm font-bold text-neutral-200 mt-1 block">
                  {formatDate(currentMember.nextDueDate)}
                </span>
              </div>
            </div>

            {isPending && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Aviso de Pago Pendiente:
                </p>
                <p>
                  Podés acercarte a recepción a abonar en <strong>Efectivo</strong> o solicitar el Alias para realizar una <strong>Transferencia bancaria</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Payment Receipts History */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-white">Comprobantes de Pago Registrados</h4>

            <div className="divide-y divide-neutral-800">
              {currentMember.paymentsHistory.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{p.period}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.method === 'efectivo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-cyan-500/15 text-cyan-400'
                      }`}>
                        {p.method === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
                      </span>
                    </div>
                    <span className="text-neutral-400 text-[11px] block mt-0.5">{p.receiptNote || 'Comprobante válido'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-white text-sm block">{formatCurrency(p.amount)}</span>
                    <span className="text-neutral-500 text-[10px] font-mono">{formatDate(p.date)}</span>
                  </div>
                </div>
              ))}

              {currentMember.paymentsHistory.length === 0 && (
                <div className="p-6 text-center text-xs text-neutral-400">
                  Aún no hay comprobantes emitidos.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
