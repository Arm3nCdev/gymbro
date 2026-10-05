import React, { useState } from 'react';
import { Dumbbell, Scale, Image as ImageIcon, MessageSquare, CreditCard, Flame, Bell, Banknote, Smartphone, CheckCircle2, AlertCircle, LogOut, Globe, User, Share2, Cake, Edit3, Camera } from 'lucide-react';
import { DailyWorkout, GymMember, ProgressPhoto, WeightMetric, PaymentMethod } from '../../types';
import { WorkoutSession } from './WorkoutSession';
import { WeightTracker } from './WeightTracker';
import { PhotoGallery } from './PhotoGallery';
import { RoutineLockedGate } from './RoutineLockedGate';
import { formatCurrency, formatDate } from '../../utils/storage';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { tenantDisplayHost } from '../../utils/tenant';
import { GymLogo } from '../common/GymLogo';

interface ClientPortalProps {
  gymName?: string;
  logoUrl?: string;
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
  onOpenProfile?: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  gymName,
  logoUrl,
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
  onOpenProfile,
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

  // Birthday calculation
  const getBirthdayDetails = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const birth = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    const isToday = today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth();
    const formatted = birth.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    return { age: Math.max(0, age), isToday, formatted };
  };

  const birthdayInfo = getBirthdayDetails(currentMember.birthDate);

  const handleSwitchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'messages' && unreadMessagesCount > 0) {
      onMarkMessagesRead();
    }
  };

  return (
    <div id="client-portal-view" className="max-w-4xl mx-auto space-y-6 pb-28 sm:pb-12">
      {/* Gym brand: logo in the corner */}
      <div className="flex items-center gap-3 -mb-2">
        <GymLogo logoUrl={logoUrl} name={gymName} size="sm" />
        <span className="text-sm font-extrabold text-white truncate">{gymName || 'GymBro'}</span>
      </div>
      {/* Clean Top Alumno Header with gymbro.run.app link, profile button and logout */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="relative group shrink-0">
            <img
              src={currentMember.avatar}
              alt={currentMember.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-lime-400 shadow-md bg-neutral-900"
            />
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                title="Editar mi foto de perfil personalizada"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 shadow-md active:scale-95 transition-all"
              >
                <Camera className="w-3 h-3 stroke-[2.5]" />
              </button>
            )}
          </div>
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
              {birthdayInfo && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                    birthdayInfo.isToday
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 animate-pulse font-black'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                  }`}
                >
                  <Cake className="w-3 h-3 text-amber-400" />
                  {birthdayInfo.isToday
                    ? '¡Hoy cumple años! 🎉'
                    : `${birthdayInfo.formatted} (${birthdayInfo.age} años)`}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {currentMember.planName} • Meta: <span className="text-neutral-300">{currentMember.goal}</span>
            </p>
            {(currentMember.bio || currentMember.description) && (
              <p className="text-xs text-neutral-300/90 italic mt-1 bg-neutral-950/60 rounded-xl px-2.5 py-1 border border-neutral-800/80 leading-relaxed max-w-xl">
                “{currentMember.bio || currentMember.description}”
              </p>
            )}
          </div>
        </div>

        {/* Right side controls: profile, domain badge & logout button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              id="btn-student-edit-profile"
              title="Modificar mi foto, cumpleaños, descripción y datos"
              className="py-1.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20 active:scale-95 whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mi Perfil</span>
            </button>
          )}

          {onOpenLinksModal ? (
            <button
              type="button"
              onClick={onOpenLinksModal}
              title="Ver y compartir enlaces de acceso"
              className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-300 font-mono transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-bold text-white">{typeof window !== 'undefined' ? `${tenantDisplayHost()}/#/alumno` : 'gymbro.app/#/alumno'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-300 font-mono">
              <Globe className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-bold text-white">{typeof window !== 'undefined' ? `${tenantDisplayHost()}/#/alumno` : 'gymbro.app/#/alumno'}</span>
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

              {/* Coaching & Routine Type Badge */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    currentMember.hasPersonalTrainer
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-lime-400/10 border-lime-400/20 text-lime-400'
                  }`}>
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {currentMember.hasPersonalTrainer
                        ? `Rutina Personalizada con Prof. ${currentMember.assignedTrainerName || 'tu profesor'}`
                        : 'Entrenamiento Autónomo (Por tu cuenta)'}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {currentMember.hasPersonalTrainer
                        ? `Turno ${currentMember.trainingShift ? currentMember.trainingShift.toUpperCase() : 'MAÑANA'} • ${currentMember.trainingScheduleNote || 'Seguimiento 1 a 1'}`
                        : 'Plan libre con acceso completo a las instalaciones'}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                  currentMember.hasPersonalTrainer
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                }`}>
                  {currentMember.hasPersonalTrainer ? '⭐ Con Profe' : '🏃‍♂️ Libre'}
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
                  Total Cuota
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

            {/* Detailed Breakdown: Base Membership + Personal Trainer Customization */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-lime-400" />
                  <span>Desglose de tu Plan de Entrenamiento</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {currentMember.membershipType === 'diario' ? 'Acceso Diario' : 'Mensualidad'}
                </span>
              </div>

              <div className="space-y-1.5 text-neutral-300 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    Membresía Base del Gimnasio ({currentMember.membershipType === 'diario' ? 'Pase Diario' : 'Mensual'}):
                  </span>
                  <span className="font-bold text-white">
                    {formatCurrency(
                      currentMember.baseMembershipPrice ||
                      (currentMember.hasPersonalTrainer
                        ? currentMember.planPrice - (currentMember.personalTrainerPrice || 0)
                        : currentMember.planPrice)
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span>Modalidad de Entrenamiento:</span>
                    {currentMember.hasPersonalTrainer ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                        Personalizado con Prof. {currentMember.assignedTrainerName || 'tu profesor'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-bold">
                        Entrena por su cuenta (Libre)
                      </span>
                    )}
                  </span>
                  <span className={`font-bold ${currentMember.hasPersonalTrainer ? 'text-purple-300' : 'text-neutral-400'}`}>
                    {currentMember.hasPersonalTrainer
                      ? `+ ${formatCurrency(currentMember.personalTrainerPrice || 100000)}`
                      : '₲ 0 (Sin costo extra)'}
                  </span>
                </div>

                {currentMember.hasPersonalTrainer && (
                  <div className="text-[11px] text-purple-300/90 bg-purple-950/20 border border-purple-900/30 p-2 rounded-lg flex items-center justify-between">
                    <span>Turno Asignado: <strong>{currentMember.trainingShift ? currentMember.trainingShift.toUpperCase() : 'MAÑANA'}</strong></span>
                    <span>{currentMember.trainingScheduleNote || 'Horario reservado con tu profesor'}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 font-extrabold text-sm text-white">
                  <span>Total Cuota a Abonar:</span>
                  <span className="text-lime-400">{formatCurrency(currentMember.planPrice)}</span>
                </div>
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

          {/* Student Profile & Personal Data Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <User className="w-4 h-4 text-lime-400" />
                <span>Mi Perfil Personal</span>
              </h4>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  id="btn-membership-edit-profile"
                  className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-lime-400 text-xs font-bold flex items-center gap-1.5 transition-colors border border-neutral-700 shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modificar Perfil</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-semibold block">Cumpleaños / Edad:</span>
                <span className="text-white font-medium flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-amber-400" />
                  {birthdayInfo ? `${birthdayInfo.formatted} (${birthdayInfo.age} años)` : 'No especificado'}
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-semibold block">Objetivo:</span>
                <span className="text-white font-medium">{currentMember.goal || 'Sin meta registrada'}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1 sm:col-span-2">
                <span className="text-neutral-500 font-semibold block">Descripción / Sobre mí:</span>
                <p className="text-neutral-300 italic">
                  {currentMember.bio || currentMember.description || 'Sin descripción aún. Pulsa en "Modificar Perfil" para agregarla.'}
                </p>
              </div>
            </div>
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
