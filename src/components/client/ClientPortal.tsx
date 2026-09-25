import React, { useState } from 'react';
import { Dumbbell, Scale, Image as ImageIcon, MessageSquare, CreditCard, Flame, Bell, Banknote, Smartphone, CheckCircle2, AlertCircle, LogOut, Globe, User, Share2 } from 'lucide-react';
import { DailyWorkout, GymMember, ProgressPhoto, WeightMetric, PaymentMethod } from '../../types';
import { WorkoutSession } from './WorkoutSession';
import { WeightTracker } from './WeightTracker';
import { PhotoGallery } from './PhotoGallery';
import { RoutineLockedGate } from './RoutineLockedGate';
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
  onNotifyPayment?: (memberId: string, method: PaymentMethod, note?: string) => void;
  onLogout?: () => void;
  allowSwitchingTrainees?: boolean;
  onOpenLinksModal?: () => void;
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
  onNotifyPayment,
  onLogout,
  allowSwitchingTrainees = false,
  onOpenLinksModal,
}) => {
  const [activeTab, setActiveTab] = useState<'workout' | 'weight' | 'photos' | 'messages' | 'membership'>('workout');

  if (!currentMember) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <p className="text-neutral-400 text-sm">No se encontró ningún alumno seleccionado.</p>
        {onLogout && (
          <button
            onClick={onLogout}
            className="py-2 px-4 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700"
          >
            Volver al inicio
          </button>
        )}
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
    <div id="client-portal-view" className="max-w-4xl mx-auto space-y-6 pb-28 sm:pb-12">
      {/* Clean Top Alumno Header with gymbro.run.app link and logout */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <img
            src={currentMember.avatar}
            alt={currentMember.name}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-lime-400/50 shadow-md"
          />
          <div className="min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-white text-lg tracking-tight truncate">{currentMember.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30 text-[10px] font-extrabold uppercase tracking-wide">
                Alumno GymBro
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isPending
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isPending ? '🔴 Cuota Pendiente' : '🟢 Al Día'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {currentMember.planName} • Meta: <span className="text-neutral-300">{currentMember.goal}</span>
            </p>
          </div>
        </div>

        {/* Right side controls: domain badge & logout button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {onOpenLinksModal ? (
            <button
              type="button"
              onClick={onOpenLinksModal}
              title="Ver y compartir enlaces de acceso"
              className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-300 font-mono transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-bold text-white">{typeof window !== 'undefined' ? `${window.location.host}/#/alumno` : 'gymbro.app/#/alumno'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-300 font-mono">
              <Globe className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-bold text-white">{typeof window !== 'undefined' ? `${window.location.host}/#/alumno` : 'gymbro.app/#/alumno'}</span>
            </div>
          )}

          {onOpenLinksModal && (
            <button
              type="button"
              onClick={onOpenLinksModal}
              title="Ver y compartir enlaces de acceso"
              className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-lime-400 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              id="btn-student-logout"
              title="Cerrar sesión"
              className="py-1.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/50 text-neutral-400 hover:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          )}
        </div>
      </div>

      {/* Switch Athlete Selector (For testing different trainees if enabled) */}
      {allowSwitchingTrainees && allMembers.length > 1 && (
        <div className="flex items-center justify-between bg-neutral-900/50 border border-neutral-800/80 rounded-2xl px-4 py-2 text-xs">
          <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-lime-400" /> Cambiar alumno para pruebas:
          </span>
          <select
            value={currentMember.id}
            onChange={(e) => onSelectMember(e.target.value)}
            id="select-athlete-switcher"
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1 text-xs font-semibold text-white focus:outline-none focus:border-lime-400 cursor-pointer"
          >
            {allMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.paymentStatus === 'al_dia' ? '🟢 Al día' : '🔴 Cuota pendiente'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Direct App Install Banner for Athletes */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center font-black shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">¿Entrenas todos los días?</h4>
            <p className="text-[11px] text-neutral-400">
              Instala GymBro en la pantalla de inicio de tu celular para abrir tu rutina al instante y sin conexión.
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
        <>
          {currentMember.paymentStatus !== 'al_dia' ? (
            <RoutineLockedGate
              member={currentMember}
              onNotifyPayment={(id, method, note) => {
                if (onNotifyPayment) {
                  onNotifyPayment(id, method, note);
                }
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-xs text-emerald-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Cuota al día • Rutina Liberada</span>
                    <span>Tu membresía está activa hasta el {formatDate(currentMember.nextDueDate)}. ¡A entrenar con todo!</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                  Habilitado
                </span>
              </div>

              <WorkoutSession
                member={currentMember}
                onUpdateWorkout={onUpdateWorkout}
                onCompleteWorkout={onCompleteWorkout}
                onUpdateMood={onUpdateMood}
              />
            </div>
          )}
        </>
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

      {/* Sticky Bottom Navigation Bar for Mobile Phones */}
      <nav
        id="client-portal-mobile-bottom-nav"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800 px-3 py-2 flex items-center justify-around shadow-2xl"
      >
        <button
          type="button"
          onClick={() => handleSwitchTab('workout')}
          id="mobile-nav-workout"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all min-w-[54px] min-h-[44px] ${
            activeTab === 'workout'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Dumbbell className={`w-5 h-5 ${activeTab === 'workout' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Rutina</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('weight')}
          id="mobile-nav-weight"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all min-w-[54px] min-h-[44px] ${
            activeTab === 'weight'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Scale className={`w-5 h-5 ${activeTab === 'weight' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Peso</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('photos')}
          id="mobile-nav-photos"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all min-w-[54px] min-h-[44px] ${
            activeTab === 'photos'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ImageIcon className={`w-5 h-5 ${activeTab === 'photos' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Fotos</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('messages')}
          id="mobile-nav-messages"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all min-w-[54px] min-h-[44px] relative ${
            activeTab === 'messages'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${activeTab === 'messages' ? 'stroke-[2.5]' : ''}`} />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center font-black">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Avisos</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('membership')}
          id="mobile-nav-membership"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all min-w-[54px] min-h-[44px] ${
            activeTab === 'membership'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <CreditCard className={`w-5 h-5 ${activeTab === 'membership' ? 'stroke-[2.5]' : ''}`} />
            {isPending && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Cuota</span>
        </button>
      </nav>
    </div>
  );
};
