import React, { useState } from 'react';
import { X, Calendar, Dumbbell, Banknote, Smartphone, Scale, Image as ImageIcon, MessageSquare, Flame, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { GymMember } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';

interface MemberDetailModalProps {
  member: GymMember | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPayment: (memberId: string) => void;
  onOpenMessage: (memberId: string) => void;
  onOpenRoutine: (member: GymMember) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
  onOpenPayment,
  onOpenMessage,
  onOpenRoutine,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'routines' | 'payments' | 'progress'>('summary');

  if (!isOpen || !member) return null;

  const safeWeightHistory = Array.isArray(member.weightHistory) ? member.weightHistory : [];
  const safeRoutines = Array.isArray(member.routines) ? member.routines : [];
  const safePayments = Array.isArray(member.paymentsHistory) ? member.paymentsHistory : [];
  const safePhotos = Array.isArray(member.photos) ? member.photos : [];

  const isPending = member.paymentStatus === 'pendiente';
  const isCash = member.paymentMethod === 'efectivo';
  const latestWeight = safeWeightHistory.length > 0 ? safeWeightHistory[safeWeightHistory.length - 1]?.weightKg : undefined;
  const initialWeight = safeWeightHistory.length > 0 ? safeWeightHistory[0]?.weightKg : undefined;
  const weightDiff = latestWeight && initialWeight ? (latestWeight - initialWeight).toFixed(1) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="member-detail-modal"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Top Profile Header */}
        <div className="p-6 bg-gradient-to-b from-neutral-950 to-neutral-900 border-b border-neutral-800 relative">
          <button
            onClick={onClose}
            id="btn-close-member-detail"
            className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img
              src={member.avatar}
              alt={member.name}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-neutral-700 shadow-md"
            />
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">{member.name}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 self-center sm:self-auto ${
                    isPending
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                      : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  {isPending ? '🔴 Cuota Pendiente' : '🟢 Al Día'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {member.phone} • {member.email}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                  {member.planName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-lime-400 font-bold">
                  {formatCurrency(member.planPrice)} / mes
                </span>
                <span className={`px-2 py-0.5 rounded-md font-semibold ${
                  isCash ? 'bg-emerald-500/15 text-emerald-400' : 'bg-cyan-500/15 text-cyan-400'
                }`}>
                  {isCash ? '💵 Efectivo' : '📲 Transferencia'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center border-b border-neutral-800 bg-neutral-950 px-6 gap-3 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'summary' ? 'border-lime-400 text-lime-400' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Ficha & Estado
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'routines' ? 'border-lime-400 text-lime-400' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Rutinas ({member.routines.length} días)
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'payments' ? 'border-lime-400 text-lime-400' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Historial de Pagos ({member.paymentsHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'progress' ? 'border-lime-400 text-lime-400' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Peso & Fotos ({member.photos.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-4">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">Racha</span>
                  <span className="text-xl font-extrabold text-lime-400 flex items-center justify-center gap-1 mt-1">
                    <Flame className="w-5 h-5 fill-lime-400" /> {member.streakDays} d
                  </span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">Asistencia</span>
                  <span className="text-base font-bold text-white mt-1 block">
                    {member.daysAbsent === 0 ? 'Hoy' : `${member.daysAbsent}d ausente`}
                  </span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">Peso Actual</span>
                  <span className="text-base font-bold text-white mt-1 block">
                    {latestWeight ? `${latestWeight} kg` : '—'}
                  </span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">Vencimiento</span>
                  <span className="text-xs font-bold text-neutral-300 mt-1 block">
                    {formatDate(member.nextDueDate)}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Objetivo:</span>
                  <span className="text-white font-semibold">{member.goal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Lesiones / Cuidados:</span>
                  <span className="text-neutral-300">{member.injuriesNotes || 'Ninguna reportada'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Miembro desde:</span>
                  <span className="text-neutral-300">{member.memberSince}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Estado anímico hoy:</span>
                  <span className="capitalize text-lime-400 font-semibold">{member.todayMood || 'Normal'}</span>
                </div>
              </div>

              {/* Quick Actions in detail */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenPayment(member.id);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Banknote className="w-4 h-4" /> Registrar Cobro
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenRoutine(member);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Dumbbell className="w-4 h-4 text-lime-400" /> Editar Rutina
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenMessage(member.id);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-4 h-4" /> Enviar Mensaje
                </button>
              </div>
            </div>
          )}

          {activeTab === 'routines' && (
            <div className="space-y-3">
              {safeRoutines.map((routine) => (
                <div key={routine.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="text-lime-400">{routine.dayOfWeek}:</span> {routine.title}
                    </h4>
                    <span className="text-xs text-neutral-400">{routine.durationMin} min</span>
                  </div>
                  <div className="divide-y divide-neutral-900 pt-1 text-xs">
                    {(routine.exercises || []).map((ex, i) => (
                      <div key={ex.id || i} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="text-neutral-200 font-medium">{ex.name}</span>
                          <span className="text-[11px] text-neutral-400 block">{ex.muscleGroup} {ex.notes && `• ${ex.notes}`}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-lime-400 font-bold">{ex.sets}x{ex.reps}</span>
                          <span className="text-neutral-400 text-[11px] block">{ex.targetWeightKg} kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              {safePayments.map((pay) => (
                <div key={pay.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{pay.period}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pay.method === 'efectivo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {pay.method === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] mt-0.5">{pay.receiptNote || 'Comprobante registrado'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white text-sm block">{formatCurrency(pay.amount)}</span>
                    <span className="text-neutral-500 text-[11px]">{formatDate(pay.date)}</span>
                  </div>
                </div>
              ))}

              {safePayments.length === 0 && (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  No hay pagos históricos registrados aún.
                </div>
              )}
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-4">
              {/* Weight list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-lime-400" /> Registro de Peso Corporal
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {safeWeightHistory.map((w) => (
                    <div key={w.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-center">
                      <span className="text-sm font-black text-white">{w.weightKg} kg</span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">{formatDate(w.date)}</span>
                      {w.note && <span className="text-[10px] text-neutral-500 truncate block mt-0.5">{w.note}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-lime-400" /> Fotos de Progreso Registradas
                </h4>
                {safePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {safePhotos.map((photo) => (
                      <div key={photo.id} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                        <img
                          src={photo.imageUrl}
                          alt="Progreso"
                          referrerPolicy="no-referrer"
                          className="w-full h-44 object-cover"
                        />
                        <div className="p-2 text-xs">
                          <div className="flex justify-between text-neutral-300 font-semibold">
                            <span>{photo.tag}</span>
                            <span>{photo.weightKg ? `${photo.weightKg} kg` : ''}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 block">{formatDate(photo.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800 text-center text-xs text-neutral-400">
                    El alumno aún no cargó fotos de progreso.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
