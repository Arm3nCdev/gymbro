import React, { useState } from 'react';
import { Search, Plus, Filter, Banknote, Smartphone, Dumbbell, MessageSquare, ChevronRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { GymMember } from '../../types';
import { formatCurrency } from '../../utils/storage';

interface MembersListProps {
  members: GymMember[];
  onOpenNewMember?: () => void;
  onOpenNewMemberModal?: () => void;
  onOpenPayment?: (memberId: string) => void;
  onOpenPaymentModal?: (memberId: string) => void;
  onOpenMessage?: (memberId: string, initialType?: any) => void;
  onOpenMessageModal?: (memberId: string, initialType?: any) => void;
  onSelectMemberDetail?: (member: GymMember) => void;
  onSelectMember?: (member: GymMember) => void;
  onSelectMemberRoutine?: (member: GymMember) => void;
  onOpenRoutinesManager?: (member: GymMember) => void;
  onConfirmApprovePayment?: (memberId: string) => void;
  onOpenLinksModal?: () => void;
}

export const MembersList: React.FC<MembersListProps> = ({
  members = [],
  onOpenNewMember,
  onOpenNewMemberModal,
  onOpenPayment,
  onOpenPaymentModal,
  onOpenMessage,
  onOpenMessageModal,
  onSelectMemberDetail,
  onSelectMember,
  onSelectMemberRoutine,
  onOpenRoutinesManager,
  onConfirmApprovePayment,
  onOpenLinksModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'al_dia' | 'pendiente'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'efectivo' | 'transferencia'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'active' | 'absent'>('all');

  const triggerOpenPayment = (id: string) => (onOpenPayment || onOpenPaymentModal || (() => {}))(id);
  const triggerOpenMessage = (id: string, type?: any) => (onOpenMessage || onOpenMessageModal || (() => {}))(id, type);
  const triggerSelectDetail = (m: GymMember) => (onSelectMemberDetail || onSelectMember || (() => {}))(m);
  const triggerSelectRoutine = (m: GymMember) => (onSelectMemberRoutine || onOpenRoutinesManager || (() => {}))(m);
  const triggerNewMember = () => (onOpenNewMember || onOpenNewMemberModal || (() => {}))();

  const filteredMembers = (members || []).filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.goal.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || m.paymentStatus === statusFilter;
    const matchesMethod = methodFilter === 'all' || m.paymentMethod === methodFilter;
    const matchesAttendance =
      attendanceFilter === 'all' ||
      (attendanceFilter === 'active' && m.daysAbsent <= 1) ||
      (attendanceFilter === 'absent' && m.daysAbsent > 1);

    return matchesSearch && matchesStatus && matchesMethod && matchesAttendance;
  });

  return (
    <div id="members-list-view" className="space-y-5">
      {/* Top action bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, objetivo o plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="input-search-members"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-lime-400"
          />
        </div>

        <button
          onClick={triggerNewMember}
          id="btn-add-member-top"
          className="py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuevo Alumno</span>
        </button>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-neutral-400 flex items-center gap-1 mr-1 font-semibold">
          <Filter className="w-3.5 h-3.5" /> Filtros:
        </span>

        {/* Status */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
            statusFilter === 'all'
              ? 'bg-neutral-800 border-neutral-700 text-white'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          Todos los estados ({members.length})
        </button>
        <button
          onClick={() => setStatusFilter('al_dia')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
            statusFilter === 'al_dia'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-emerald-400'
          }`}
        >
          🟢 Al día ({members.filter((m) => m.paymentStatus === 'al_dia').length})
        </button>
        <button
          onClick={() => setStatusFilter('pendiente')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
            statusFilter === 'pendiente'
              ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-amber-400'
          }`}
        >
          🔴 Pago pendiente ({members.filter((m) => m.paymentStatus === 'pendiente').length})
        </button>

        {/* Method */}
        <div className="h-4 w-px bg-neutral-800 mx-1 hidden sm:block" />

        <button
          onClick={() => setMethodFilter(methodFilter === 'efectivo' ? 'all' : 'efectivo')}
          className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
            methodFilter === 'efectivo'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" /> 💵 Efectivo
        </button>

        <button
          onClick={() => setMethodFilter(methodFilter === 'transferencia' ? 'all' : 'transferencia')}
          className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
            methodFilter === 'transferencia'
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" /> 📲 Transferencia
        </button>

        <div className="h-4 w-px bg-neutral-800 mx-1 hidden sm:block" />

        <button
          onClick={() => setAttendanceFilter(attendanceFilter === 'absent' ? 'all' : 'absent')}
          className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
            attendanceFilter === 'absent'
              ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-bold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          🚨 Ausentes ({members.filter((m) => m.daysAbsent > 1).length})
        </button>
      </div>

      {/* Members Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isPending = member.paymentStatus === 'pendiente';
          const isCash = member.paymentMethod === 'efectivo';
          const currentWeight = member.weightHistory[member.weightHistory.length - 1]?.weightKg;

          return (
            <div
              key={member.id}
              id={`member-card-${member.id}`}
              className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg"
            >
              <div>
                {/* Header: Avatar, Name, Badges */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
                    />
                    <div>
                      <h3
                        onClick={() => triggerSelectDetail(member)}
                        className="font-bold text-white text-base hover:text-lime-400 cursor-pointer flex items-center gap-1.5"
                      >
                        {member.name}
                      </h3>
                      <p className="text-xs text-neutral-400">{member.phone}</p>
                    </div>
                  </div>

                  {/* Payment Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isPending
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 animate-pulse'
                        : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                    }`}
                  >
                    {isPending ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {isPending ? 'Pendiente' : 'Al día'}
                  </span>
                </div>

                {/* Pending Payment Notification Alert from Student */}
                {member.pendingPaymentApproval && (
                  <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 mb-3 flex items-center justify-between gap-2 text-xs text-amber-300 animate-pulse">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Alumno avisó pago: {member.pendingPaymentApproval.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerOpenPayment(member.id)}
                      className="px-2 py-1 rounded-lg bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap shadow-sm"
                    >
                      Aprobar
                    </button>
                  </div>
                )}

                {/* Plan & Payment method */}
                <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 mb-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">Plan:</span>
                    <span className="font-semibold text-white">{member.planName}</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">Método de pago:</span>
                    <span
                      className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                        isCash
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {isCash ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                      {isCash ? 'Efectivo 💵' : 'Transferencia 📲'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">Cuota:</span>
                    <span className="font-bold text-lime-400">{formatCurrency(member.planPrice)}</span>
                  </div>
                </div>

                {/* Fitness Metrics Pill */}
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-4 px-1">
                  <div>
                    <span className="text-neutral-500">Peso: </span>
                    <span className="text-neutral-200 font-semibold">{currentWeight ? `${currentWeight} kg` : 'Sin registrar'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Asistencia: </span>
                    <span
                      className={`font-semibold ${
                        member.daysAbsent > 2 ? 'text-rose-400' : 'text-neutral-200'
                      }`}
                    >
                      {member.daysAbsent === 0
                        ? '🔥 Hoy en el gym'
                        : `${member.daysAbsent} días ausente`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center gap-2">
                {/* Payment button */}
                <button
                  onClick={() =>
                    member.pendingPaymentApproval && onConfirmApprovePayment
                      ? onConfirmApprovePayment(member.id)
                      : triggerOpenPayment(member.id)
                  }
                  id={`btn-charge-${member.id}`}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    member.pendingPaymentApproval
                      ? 'bg-lime-400 text-neutral-950 hover:bg-lime-300 shadow-md shadow-lime-400/20 ring-2 ring-lime-400/40'
                      : isPending
                      ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow-md shadow-amber-400/20'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                  title="Cobrar / Registrar pago"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>{member.pendingPaymentApproval ? '✓ Confirmar' : isPending ? 'Cobrar' : 'Registrar'}</span>
                </button>

                {/* Routine button */}
                <button
                  onClick={() => triggerSelectRoutine(member)}
                  id={`btn-routines-${member.id}`}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-lime-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Ver y editar rutinas personalizadas"
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Rutina</span>
                </button>

                {/* Message button */}
                <button
                  onClick={() => triggerOpenMessage(member.id, isPending ? 'payment_reminder' : member.daysAbsent > 1 ? 'absent_funny' : 'workout_reminder')}
                  id={`btn-message-${member.id}`}
                  className="py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center transition-all"
                  title="Enviar recordatorio o mensaje"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                {/* Details */}
                <button
                  onClick={() => triggerSelectDetail(member)}
                  id={`btn-detail-${member.id}`}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
                  title="Ver perfil completo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center text-neutral-400 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-white font-['Syne',sans-serif]">
              {members.length === 0 ? 'Gimnasio Listo para Empezar' : 'No se encontraron alumnos'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              {members.length === 0
                ? 'El sistema está limpio y preparado. Puedes compartir el Código QR a los alumnos para que se registren desde su celular, o crearlos tú mismo directamente.'
                : 'Probá cambiando el término de búsqueda o restableciendo los filtros.'}
            </p>
          </div>

          {members.length === 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {onOpenLinksModal && (
                <button
                  type="button"
                  onClick={onOpenLinksModal}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-lime-400/20"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Ver Código QR para Alumnos</span>
                </button>
              )}
              <button
                type="button"
                onClick={triggerNewMember}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Alumno Manualmente</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
