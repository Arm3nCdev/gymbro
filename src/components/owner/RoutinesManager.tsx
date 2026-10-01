import React, { useState } from 'react';
import { Dumbbell, Plus, Trash2, Sparkles, Clock, Check, Save, User, ChevronDown } from 'lucide-react';
import { DailyWorkout, Exercise, GymMember } from '../../types';
import { INITIAL_EXERCISE_LIBRARY } from '../../data/initialData';

interface RoutinesManagerProps {
  members: GymMember[];
  selectedMemberId?: string;
  onUpdateMemberRoutines: (memberId: string, routines: DailyWorkout[]) => void;
}

export const RoutinesManager: React.FC<RoutinesManagerProps> = ({
  members = [],
  selectedMemberId,
  onUpdateMemberRoutines,
}) => {
  const safeMembers = Array.isArray(members) ? members : [];
  const [activeMemberId, setActiveMemberId] = useState(selectedMemberId || safeMembers[0]?.id || '');
  const activeMember = safeMembers.find((m) => m.id === activeMemberId) || safeMembers[0] || null;

  const [routines, setRoutines] = useState<DailyWorkout[]>(activeMember?.routines || []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // Sync when active member changes
  const handleMemberChange = (id: string) => {
    setActiveMemberId(id);
    const m = safeMembers.find((x) => x.id === id);
    if (m) {
      setRoutines(Array.isArray(m.routines) ? m.routines : []);
      setSelectedDayIndex(0);
    }
  };

  const currentRoutine = (Array.isArray(routines) && routines.length > 0)
    ? (routines[selectedDayIndex] || routines[0])
    : null;

  const handleUpdateExercise = (exerciseIndex: number, field: keyof Exercise, value: any) => {
    const updated = [...routines];
    if (!updated[selectedDayIndex]) return;
    const exs = [...updated[selectedDayIndex].exercises];
    exs[exerciseIndex] = { ...exs[exerciseIndex], [field]: value };
    updated[selectedDayIndex].exercises = exs;
    setRoutines(updated);
  };

  const handleDeleteExercise = (exerciseIndex: number) => {
    const updated = [...routines];
    if (!updated[selectedDayIndex]) return;
    updated[selectedDayIndex].exercises = updated[selectedDayIndex].exercises.filter((_, i) => i !== exerciseIndex);
    setRoutines(updated);
  };

  const handleAddPresetExercise = (preset: typeof INITIAL_EXERCISE_LIBRARY[0]) => {
    const newEx: Exercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      muscleGroup: preset.muscleGroup,
      sets: preset.defaultSets,
      reps: preset.defaultReps,
      targetWeightKg: 20,
      restSeconds: preset.defaultRest,
      notes: '',
      completedSets: Array(preset.defaultSets).fill(false),
    };

    const updated = [...routines];
    if (!updated[selectedDayIndex]) return;
    updated[selectedDayIndex].exercises.push(newEx);
    setRoutines(updated);
    setShowAddExercise(false);
  };

  const handleAddDay = () => {
    const dayNames: DailyWorkout['dayOfWeek'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const usedDays = routines.map((r) => r.dayOfWeek);
    const nextDay = dayNames.find((d) => !usedDays.includes(d)) || 'Lunes';

    const newWorkout: DailyWorkout = {
      id: `rout_${Date.now()}`,
      dayOfWeek: nextDay,
      title: `Rutina de ${nextDay}`,
      durationMin: 50,
      completedToday: false,
      exercises: [
        {
          id: `ex_${Date.now()}`,
          name: 'Press de Banca Plano con Barra',
          muscleGroup: 'Pecho',
          sets: 4,
          reps: '10',
          targetWeightKg: 40,
          restSeconds: 90,
          notes: 'Foco en técnica.',
          completedSets: [false, false, false, false],
        },
      ],
    };

    const updated = [...routines, newWorkout];
    setRoutines(updated);
    setSelectedDayIndex(updated.length - 1);
  };

  const handleDeleteDay = (index: number) => {
    if (routines.length <= 1) return;
    const updated = routines.filter((_, i) => i !== index);
    setRoutines(updated);
    setSelectedDayIndex(Math.max(0, index - 1));
  };

  const handleSave = () => {
    if (!activeMember) return;
    setIsSaving(true);
    onUpdateMemberRoutines(activeMember.id, routines);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }, 400);
  };

  const handleGenerateAiRoutine = async () => {
    if (!activeMember) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: activeMember.name,
          goal: activeMember.goal,
          daysPerWeek: routines.length || 3,
          level: 'Intermedio',
          injuriesNotes: activeMember.injuriesNotes,
        }),
      });

      const data = await res.json();
      if (data.routine && Array.isArray(data.routine.days)) {
        const formatted: DailyWorkout[] = data.routine.days.map((d: any, idx: number) => ({
          id: `rout_ai_${Date.now()}_${idx}`,
          dayOfWeek: d.dayName || 'Lunes',
          title: d.title || 'Entrenamiento del día',
          durationMin: d.durationMin || 50,
          completedToday: false,
          exercises: (d.exercises || []).map((ex: any, eIdx: number) => ({
            id: `ex_ai_${Date.now()}_${eIdx}`,
            name: ex.name,
            muscleGroup: ex.muscleGroup || 'General',
            sets: Number(ex.sets) || 4,
            reps: String(ex.reps) || '10-12',
            targetWeightKg: Number(ex.targetWeightKg) || 20,
            restSeconds: Number(ex.restSeconds) || 75,
            notes: ex.notes || '',
            completedSets: Array(Number(ex.sets) || 4).fill(false),
          })),
        }));

        setRoutines(formatted);
        setSelectedDayIndex(0);
        onUpdateMemberRoutines(activeMember.id, formatted);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error generating AI routine:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (!activeMember) return null;

  return (
    <div id="routines-manager-view" className="space-y-6">
      {/* Top Header: Member Selector & AI Generator */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={activeMember.avatar}
              alt={activeMember.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Personalizando rutina para:
              </label>
            </div>
            <div className="relative inline-block mt-0.5">
              <select
                value={activeMemberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                id="select-routine-member"
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-lime-400 pr-8 cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — ({m.goal})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-lime-400/90 font-medium mt-1">
              Objetivo: {activeMember.goal} {activeMember.injuriesNotes && `• Cuidado: ${activeMember.injuriesNotes}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateAiRoutine}
            disabled={isGeneratingAi}
            id="btn-ai-generate-routine"
            className="flex-1 md:flex-initial py-2.5 px-4 rounded-xl bg-neutral-950 border border-lime-400/40 hover:border-lime-400 text-lime-400 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            title="Generar plan adaptado automáticamente según objetivo y lesiones"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-lime-400" />
            <span>{isGeneratingAi ? 'Diseñando con IA...' : 'Generar Rutina con IA'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            id="btn-save-routine"
            className="flex-1 md:flex-initial py-2.5 px-5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" /> ¡Guardado!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Days Tabs (Lunes, Martes, etc.) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {routines.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setSelectedDayIndex(idx)}
              id={`tab-routine-day-${idx}`}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                selectedDayIndex === idx
                  ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>{day.dayOfWeek}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedDayIndex === idx ? 'bg-neutral-950/20 text-neutral-950' : 'bg-neutral-800 text-neutral-300'
              }`}>
                {day.exercises.length} ejer.
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleAddDay}
          id="btn-add-routine-day"
          className="py-2.5 px-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Día</span>
        </button>
      </div>

      {/* Selected Day Workout Details */}
      {currentRoutine && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-5 shadow-sm">
          {/* Day Title & Duration Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentRoutine.title}
                  onChange={(e) => {
                    const updated = [...routines];
                    updated[selectedDayIndex].title = e.target.value;
                    setRoutines(updated);
                  }}
                  placeholder="Título del entrenamiento (ej: Pecho y Tríceps)"
                  className="bg-transparent font-black text-xl text-white border-b border-transparent hover:border-neutral-700 focus:border-lime-400 focus:outline-none w-full max-w-md py-0.5"
                />
              </div>
              <p className="text-xs text-neutral-400">
                Día programado: <span className="text-lime-400 font-semibold">{currentRoutine.dayOfWeek}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-300">
                <Clock className="w-3.5 h-3.5 text-lime-400" />
                <input
                  type="number"
                  value={currentRoutine.durationMin}
                  onChange={(e) => {
                    const updated = [...routines];
                    updated[selectedDayIndex].durationMin = Number(e.target.value);
                    setRoutines(updated);
                  }}
                  className="w-10 bg-transparent text-center font-bold text-white focus:outline-none"
                />
                <span>min</span>
              </div>

              {routines.length > 1 && (
                <button
                  onClick={() => handleDeleteDay(selectedDayIndex)}
                  id="btn-delete-day"
                  className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar este día de entrenamiento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-3">
            {currentRoutine.exercises.map((exercise, exIdx) => (
              <div
                key={exercise.id}
                id={`exercise-card-${exercise.id}`}
                className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
              >
                {/* Exercise name & muscle group */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold text-xs">
                      {exIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={exercise.name}
                      onChange={(e) => handleUpdateExercise(exIdx, 'name', e.target.value)}
                      className="bg-transparent font-bold text-sm text-white focus:outline-none focus:border-b focus:border-lime-400 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 pl-8">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 border border-lime-400/20">
                      {exercise.muscleGroup}
                    </span>
                    <input
                      type="text"
                      value={exercise.notes || ''}
                      onChange={(e) => handleUpdateExercise(exIdx, 'notes', e.target.value)}
                      placeholder="Indicación técnica (ej: bajar en 3s)..."
                      className="bg-transparent text-xs text-neutral-400 hover:text-neutral-200 focus:text-neutral-200 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Sets, Reps, Weight, Rest */}
                <div className="flex items-center gap-2 sm:gap-4 pl-8 md:pl-0 flex-wrap text-xs">
                  {/* Sets */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">Series</span>
                    <input
                      type="number"
                      value={exercise.sets}
                      onChange={(e) => handleUpdateExercise(exIdx, 'sets', Number(e.target.value))}
                      className="w-12 bg-neutral-900 border border-neutral-800 rounded-lg py-1 text-center font-bold text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  {/* Reps */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">Reps</span>
                    <input
                      type="text"
                      value={exercise.reps}
                      onChange={(e) => handleUpdateExercise(exIdx, 'reps', e.target.value)}
                      className="w-16 bg-neutral-900 border border-neutral-800 rounded-lg py-1 text-center font-bold text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  {/* Target Weight */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">Peso (kg)</span>
                    <input
                      type="number"
                      value={exercise.targetWeightKg}
                      onChange={(e) => handleUpdateExercise(exIdx, 'targetWeightKg', Number(e.target.value))}
                      className="w-14 bg-neutral-900 border border-neutral-800 rounded-lg py-1 text-center font-bold text-lime-400 focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  {/* Rest Seconds */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">Descanso</span>
                    <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1">
                      <input
                        type="number"
                        value={exercise.restSeconds}
                        onChange={(e) => handleUpdateExercise(exIdx, 'restSeconds', Number(e.target.value))}
                        className="w-10 bg-transparent text-center font-bold text-white focus:outline-none"
                      />
                      <span className="text-neutral-500 text-[10px]">s</span>
                    </div>
                  </div>

                  {/* Delete exercise */}
                  <button
                    onClick={() => handleDeleteExercise(exIdx)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors ml-1"
                    title="Eliminar ejercicio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Exercise Trigger */}
          <div>
            {showAddExercise ? (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Seleccionar Ejercicio de la Biblioteca
                  </h4>
                  <button
                    onClick={() => setShowAddExercise(false)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                  {INITIAL_EXERCISE_LIBRARY.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddPresetExercise(preset)}
                      className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 hover:border-lime-400/50 text-left transition-all group"
                    >
                      <span className="font-semibold text-xs text-white group-hover:text-lime-400 block truncate">
                        {preset.name}
                      </span>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                        <span>{preset.muscleGroup}</span>
                        <span>{preset.defaultSets}x{preset.defaultReps} ({preset.defaultRest}s)</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddExercise(true)}
                id="btn-open-add-exercise"
                className="w-full py-3 rounded-xl border border-dashed border-neutral-700 hover:border-lime-400 text-neutral-400 hover:text-lime-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors bg-neutral-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Ejercicio a la Rutina</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
