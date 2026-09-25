import React, { useState } from 'react';
import {
  Dumbbell,
  Users,
  MessageSquare,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Plus,
  Edit,
  Save,
  Trash2,
  LogOut,
  Globe,
  Share2,
  Calendar,
  Heart,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { AuthUser, DailyWorkout, Exercise, GymMember, TrainerViewTab } from '../../types';
import { createWhatsAppLink, formatCurrency, formatDate } from '../../utils/storage';

interface TrainerPortalProps {
  currentUser: AuthUser;
  members: GymMember[];
  onUpdateMemberRoutines: (memberId: string, routines: DailyWorkout[]) => void;
  onLogout: () => void;
  onOpenMessageModal: (memberId: string) => void;
  onApprovePayment?: (memberId: string) => void;
  onOpenLinksModal?: () => void;
}

export const TrainerPortal: React.FC<TrainerPortalProps> = ({
  currentUser,
  members = [],
  onUpdateMemberRoutines,
  onLogout,
  onOpenMessageModal,
  onApprovePayment,
  onOpenLinksModal,
}) => {
  const [activeTab, setActiveTab] = useState<TrainerViewTab>('assigned_members');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('Lunes');

  // Exercise edit state
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Pecho');
  const [newExSets, setNewExSets] = useState(4);
  const [newExReps, setNewExReps] = useState('10-12');
  const [newExKg, setNewExKg] = useState(20);
  const [newExRest, setNewExRest] = useState(60);
  const [newExNotes, setNewExNotes] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.planName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentRoutine = selectedMember?.routines?.find((r) => r.dayOfWeek === selectedDayOfWeek) ||
    selectedMember?.routines?.[0] || null;

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !newExName.trim()) return;

    const newEx: Exercise = {
      id: `ex_${Date.now()}`,
      name: newExName.trim(),
      muscleGroup: newExMuscle,
      sets: Number(newExSets) || 3,
      reps: newExReps.trim() || '12',
      targetWeightKg: Number(newExKg) || 0,
      restSeconds: Number(newExRest) || 60,
      notes: newExNotes.trim() || undefined,
      completedSets: Array(Number(newExSets) || 3).fill(false),
    };

    const routines = selectedMember.routines ? [...selectedMember.routines] : [];
    const routineIndex = routines.findIndex((r) => r.dayOfWeek === selectedDayOfWeek);

    if (routineIndex >= 0) {
      routines[routineIndex] = {
        ...routines[routineIndex],
        exercises: [...routines[routineIndex].exercises, newEx],
      };
    } else {
      routines.push({
        id: `rout_${Date.now()}`,
        dayOfWeek: selectedDayOfWeek as any,
        title: `Rutina de ${selectedDayOfWeek}`,
        durationMin: 50,
        completedToday: false,
        exercises: [newEx],
      });
    }

    onUpdateMemberRoutines(selectedMember.id, routines);

    // Reset form
    setNewExName('');
    setNewExNotes('');
    setIsAddingExercise(false);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!selectedMember || !currentRoutine) return;
    const routines = selectedMember.routines.map((r) => {
      if (r.id === currentRoutine.id) {
        return {
          ...r,
          exercises: r.exercises.filter((ex) => ex.id !== exerciseId),
        };
      }
      return r;
    });
    onUpdateMemberRoutines(selectedMember.id, routines);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-lime-400 selection:text-neutral-950">
      {/* Header for Trainer */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Portal Info */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-lime-400/20 font-black shrink-0">
                <Dumbbell className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-white font-['Syne',sans-serif]">
                    GymBro Entrenadores
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-[10px] font-extrabold uppercase">
                    COACH
                  </span>
                  {onOpenLinksModal ? (
                    <button
                      type="button"
                      onClick={onOpenLinksModal}
                      title="Ver enlaces de acceso separados"
                      className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-2 py-0.5 rounded-lg text-[11px] text-neutral-300 font-mono transition-colors"
                    >
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span className="font-bold text-white">{typeof window !== 'undefined' ? `${window.location.host}/#/coach` : 'gymbro.app/#/coach'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-lg text-[11px] text-neutral-300 font-mono">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span className="font-bold text-white">{typeof window !== 'undefined' ? `${window.location.host}/#/coach` : 'gymbro.app/#/coach'}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 -mt-0.5">
                  Planificación deportiva, rutinas y seguimiento de atletas
                </p>
              </div>
            </div>

            {/* Mobile Logout */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Info & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {onOpenLinksModal && (
              <button
                type="button"
                onClick={onOpenLinksModal}
                id="btn-trainer-open-links"
                className="py-1.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Links de Acceso</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-neutral-400">Entrenador:</span>
              <span className="font-bold text-white">{currentUser.name}</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              id="btn-trainer-logout"
              title="Cerrar sesión"
              className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/50 text-neutral-400 hover:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
        {/* Navigation Tabs for Trainer */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('assigned_members')}
            id="tab-trainer-members"
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'assigned_members'
                ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alumnos Asignados ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routines')}
            id="tab-trainer-routines"
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'routines'
                ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Editor de Rutinas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            id="tab-trainer-progress"
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Seguimiento y Pesos</span>
          </button>
        </div>

        {/* TAB 1: LIST OF ALUMNOS */}
        {activeTab === 'assigned_members' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <div>
                <h2 className="text-base font-bold text-white">Alumnos en Entrenamiento</h2>
                <p className="text-xs text-neutral-400">
                  Controla la asistencia, objetivos y estado de rutina de cada alumno.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar alumno por nombre u objetivo..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const totalExercises = (member.routines || []).reduce(
                  (sum, r) => sum + (r.exercises?.length || 0),
                  0
                );

                return (
                  <div
                    key={member.id}
                    id={`trainer-card-member-${member.id}`}
                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-neutral-700 shrink-0"
                          />
                          <div>
                            <h3 className="font-extrabold text-sm text-white">{member.name}</h3>
                            <span className="text-[11px] text-neutral-400 block">{member.planName}</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                                member.paymentStatus === 'al_dia'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {member.paymentStatus === 'al_dia' ? '🟢 Cuota al día' : '🟡 Pago pendiente'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-lime-400 font-bold text-xs">
                            <Flame className="w-3.5 h-3.5 fill-lime-400" />
                            <span>{member.streakDays}d racha</span>
                          </div>
                        </div>
                      </div>

                      {member.pendingPaymentApproval && (
                        <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2 mb-2.5 flex items-center justify-between gap-2 text-xs text-amber-300 animate-pulse">
                          <span className="text-[11px] font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            Avisó pago ({member.pendingPaymentApproval.method})
                          </span>
                          {onApprovePayment && (
                            <button
                              type="button"
                              onClick={() => onApprovePayment(member.id)}
                              className="px-2 py-1 rounded-lg bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-[10px] uppercase shadow-sm"
                            >
                              Habilitar
                            </button>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80 mb-3">
                        <div className="text-neutral-300">
                          <span className="text-neutral-500 font-semibold">Meta:</span> {member.goal}
                        </div>
                        {member.injuriesNotes && (
                          <div className="text-amber-400/90 text-[11px]">
                            ⚠️ {member.injuriesNotes}
                          </div>
                        )}
                        <div className="text-neutral-400 text-[11px]">
                          Último entreno: {member.lastAttended} • {totalExercises} ejercicios activos
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setActiveTab('routines');
                        }}
                        id={`btn-trainer-view-routine-${member.id}`}
                        className="py-2 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span>Ver Rutina</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenMessageModal(member.id)}
                        id={`btn-trainer-message-${member.id}`}
                        className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Mensaje</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredMembers.length === 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center text-neutral-400 space-y-4 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-white font-['Syne',sans-serif]">
                    {members.length === 0 ? 'Sin alumnos registrados aún' : 'No se encontraron alumnos'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                    {members.length === 0
                      ? 'Los alumnos pueden registrarse escaneando el código QR en la entrada del gimnasio o el dueño puede asignarlos directamente. En cuanto se registren, aparecerán aquí para asignarles sus rutinas.'
                      : 'Prueba buscando con otro término.'}
                  </p>
                </div>
                {onOpenLinksModal && (
                  <button
                    type="button"
                    onClick={onOpenLinksModal}
                    className="py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-extrabold text-xs transition-colors inline-flex items-center gap-2 shadow-md shadow-cyan-400/20"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Ver Código QR para Alumnos</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROUTINE EDITOR */}
        {activeTab === 'routines' && !selectedMember && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center text-neutral-400 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto">
              <Dumbbell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No hay alumnos para armar rutina</h3>
            <p className="text-xs text-neutral-400">
              Registra o comparte el QR a tus alumnos para comenzar a planificar sus entrenamientos.
            </p>
            {onOpenLinksModal && (
              <button
                type="button"
                onClick={onOpenLinksModal}
                className="py-2 px-4 rounded-xl bg-lime-400 text-neutral-950 font-bold text-xs"
              >
                Abrir Accesos y QR
              </button>
            )}
          </div>
        )}
        {activeTab === 'routines' && selectedMember && (
          <div className="space-y-6">
            {/* Student selector banner */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <img
                  src={selectedMember.avatar}
                  alt={selectedMember.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">{selectedMember.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-lime-400 font-semibold">
                      {selectedMember.planName}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Meta: <strong className="text-neutral-200">{selectedMember.goal}</strong>
                  </p>
                </div>
              </div>

              {/* Selector dropdown */}
              <div className="w-full sm:w-auto flex items-center gap-2">
                <span className="text-xs text-neutral-400 whitespace-nowrap">Cambiar alumno:</span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.goal.slice(0, 20)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Day of week bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayOfWeek(day)}
                  id={`btn-day-${day}`}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedDayOfWeek === day
                      ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Exercises List for Selected Day */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-lime-400" />
                    Rutina de {selectedDayOfWeek} • {currentRoutine?.title || 'Sin título'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {currentRoutine?.exercises?.length || 0} ejercicios programados
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingExercise(!isAddingExercise)}
                  id="btn-trainer-add-exercise"
                  className="py-2 px-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isAddingExercise ? 'Cancelar' : 'Agregar Ejercicio'}</span>
                </button>
              </div>

              {/* Form to Add Exercise */}
              {isAddingExercise && (
                <form
                  onSubmit={handleAddExercise}
                  className="bg-neutral-950 border border-lime-400/40 rounded-2xl p-4 space-y-4 animate-in fade-in duration-200"
                >
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-lime-400">
                    Nuevo Ejercicio para {selectedDayOfWeek}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs text-neutral-400">Nombre del Ejercicio *</label>
                      <input
                        type="text"
                        required
                        value={newExName}
                        onChange={(e) => setNewExName(e.target.value)}
                        placeholder="Ej: Press de Banca Plano con Barra"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Grupo Muscular</label>
                      <select
                        value={newExMuscle}
                        onChange={(e) => setNewExMuscle(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      >
                        <option value="Pecho">Pecho</option>
                        <option value="Espalda">Espalda</option>
                        <option value="Piernas">Piernas</option>
                        <option value="Hombros">Hombros</option>
                        <option value="Bíceps">Bíceps</option>
                        <option value="Tríceps">Tríceps</option>
                        <option value="Core">Core / Abdomen</option>
                        <option value="Cardio">Cardio</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Series</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newExSets}
                        onChange={(e) => setNewExSets(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Repeticiones</label>
                      <input
                        type="text"
                        value={newExReps}
                        onChange={(e) => setNewExReps(e.target.value)}
                        placeholder="Ej: 10-12"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Carga Sugerida (kg)</label>
                      <input
                        type="number"
                        min="0"
                        value={newExKg}
                        onChange={(e) => setNewExKg(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Descanso (seg)</label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        value={newExRest}
                        onChange={(e) => setNewExRest(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400">Indicaciones del Coach (opcional)</label>
                    <input
                      type="text"
                      value={newExNotes}
                      onChange={(e) => setNewExNotes(e.target.value)}
                      placeholder="Ej: Bajar en 2 segundos, no despegar los glúteos del banco"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingExercise(false)}
                      className="py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      id="btn-save-new-exercise"
                      className="py-2 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-extrabold"
                    >
                      Guardar en Rutina
                    </button>
                  </div>
                </form>
              )}

              {/* Table / List of Exercises */}
              <div className="space-y-2.5">
                {currentRoutine && currentRoutine.exercises.length > 0 ? (
                  currentRoutine.exercises.map((exercise, idx) => (
                    <div
                      key={exercise.id || idx}
                      id={`trainer-exercise-item-${exercise.id || idx}`}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-neutral-900 text-lime-400 font-bold text-xs flex items-center justify-center border border-neutral-800">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{exercise.name}</h4>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-400">
                              {exercise.muscleGroup}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            {exercise.sets} series x {exercise.reps} • {exercise.targetWeightKg} kg • {exercise.restSeconds}s descanso
                          </div>
                          {exercise.notes && (
                            <div className="text-[11px] text-neutral-400 italic mt-0.5">
                              💡 {exercise.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteExercise(exercise.id)}
                          title="Eliminar ejercicio"
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-neutral-400 text-xs">
                    No hay ejercicios registrados para el día {selectedDayOfWeek}. Haz clic en "Agregar Ejercicio" para armar el plan.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROGRESS */}
        {activeTab === 'progress' && selectedMember && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-2">
                Historial de Peso Corporal: {selectedMember.name}
              </h3>
              <div className="space-y-2">
                {(selectedMember.weightHistory || []).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                  >
                    <span className="text-neutral-400">{formatDate(w.date)}</span>
                    <span className="font-extrabold text-lime-400 text-sm">{w.weightKg} kg</span>
                    <span className="text-neutral-400">{w.note || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Navigation Bar for Mobile Phones */}
      <nav
        id="trainer-portal-mobile-bottom-nav"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800 px-3 py-2 flex items-center justify-around shadow-2xl"
      >
        <button
          type="button"
          onClick={() => setActiveTab('assigned_members')}
          id="mobile-trainer-tab-members"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all min-w-[70px] min-h-[44px] ${
            activeTab === 'assigned_members'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'assigned_members' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Alumnos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routines')}
          id="mobile-trainer-tab-routines"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all min-w-[70px] min-h-[44px] ${
            activeTab === 'routines'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Dumbbell className={`w-5 h-5 ${activeTab === 'routines' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Rutinas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          id="mobile-trainer-tab-progress"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all min-w-[70px] min-h-[44px] ${
            activeTab === 'progress'
              ? 'text-lime-400 font-extrabold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'progress' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">Progreso</span>
        </button>
      </nav>
    </div>
  );
};
