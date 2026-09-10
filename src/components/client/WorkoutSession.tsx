import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Dumbbell, Check, CheckCircle2, Clock, Flame, Sparkles, Timer as TimerIcon, Trophy, Heart, Smile, RefreshCw } from 'lucide-react';
import { DailyWorkout, Exercise, GymMember } from '../../types';
import { RestTimer } from '../common/RestTimer';

interface WorkoutSessionProps {
  member: GymMember;
  onUpdateWorkout: (routineId: string, updatedWorkout: DailyWorkout) => void;
  onCompleteWorkout: () => void;
  onUpdateMood: (mood: 'energia' | 'cansado' | 'desmotivado' | 'adolorido') => void;
}

export const WorkoutSession: React.FC<WorkoutSessionProps> = ({
  member,
  onUpdateWorkout,
  onCompleteWorkout,
  onUpdateMood,
}) => {
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);
  const [showRestTimerWidget, setShowRestTimerWidget] = useState(false);
  const [justCompleted, setJustCompleted] = useState(member.todayWorkoutCompleted || false);

  const routines = Array.isArray(member?.routines) ? member.routines : [];
  const currentRoutine = routines.length > 0 ? (routines[selectedRoutineIndex] || routines[0]) : null;

  const handleToggleSet = (exerciseIndex: number, setIndex: number) => {
    if (!currentRoutine) return;
    const updatedExercises = [...currentRoutine.exercises];
    const exercise = { ...updatedExercises[exerciseIndex] };
    const currentCompleted = exercise.completedSets ? [...exercise.completedSets] : Array(exercise.sets).fill(false);

    const isNowDone = !currentCompleted[setIndex];
    currentCompleted[setIndex] = isNowDone;
    exercise.completedSets = currentCompleted;
    updatedExercises[exerciseIndex] = exercise;

    const updatedRoutine: DailyWorkout = {
      ...currentRoutine,
      exercises: updatedExercises,
    };

    onUpdateWorkout(currentRoutine.id, updatedRoutine);

    // If set just marked completed, open rest timer with exercise's rest seconds!
    if (isNowDone) {
      setActiveTimerSeconds(exercise.restSeconds || 60);
      setShowRestTimerWidget(true);
    }
  };

  const handleFinishWorkout = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#A3E635', '#22C55E', '#38BDF8', '#F59E0B'],
    });
    setJustCompleted(true);
    onCompleteWorkout();
  };

  // Calculate workout completion percentage
  let totalSets = 0;
  let completedSetsCount = 0;
  if (currentRoutine) {
    currentRoutine.exercises.forEach((ex) => {
      totalSets += ex.sets;
      if (ex.completedSets) {
        completedSetsCount += ex.completedSets.filter(Boolean).length;
      }
    });
  }
  const percentDone = totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;

  return (
    <div id="client-workout-session" className="space-y-6">
      {/* Greeting & Streak Card */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-lime-400">
              ¡A entrenar hoy, GymBro!
            </span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">
              Hola, {member.name}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {currentRoutine ? `${currentRoutine.title} • ${currentRoutine.durationMin} min aprox` : 'Seleccioná tu rutina diaria'}
            </p>
          </div>

          <div className="flex flex-col items-center bg-neutral-950/80 border border-neutral-800 rounded-xl px-3.5 py-2">
            <div className="flex items-center gap-1.5 text-lime-400 font-black text-lg">
              <Flame className="w-5 h-5 fill-lime-400 animate-pulse" />
              <span>{member.streakDays}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Días Racha
            </span>
          </div>
        </div>

        {/* Mood check-in */}
        <div className="mt-4 pt-4 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-300">
              ¿Cómo te sentís para entrenar hoy?
            </span>
            {member.todayMood && (
              <span className="text-[11px] text-lime-400 font-semibold">
                Estado: {member.todayMood}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onUpdateMood('energia')}
              id="mood-btn-energy"
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                member.todayMood === 'energia'
                  ? 'bg-lime-400/20 border-lime-400 text-lime-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>⚡ Con energía</span>
            </button>
            <button
              onClick={() => onUpdateMood('cansado')}
              id="mood-btn-tired"
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                member.todayMood === 'cansado'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>🥱 Cansado</span>
            </button>
            <button
              onClick={() => onUpdateMood('adolorido')}
              id="mood-btn-sore"
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                member.todayMood === 'adolorido'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>🤕 Con dolor</span>
            </button>
            <button
              onClick={() => onUpdateMood('desmotivado')}
              id="mood-btn-down"
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                member.todayMood === 'desmotivado'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>🏠 Desanimado</span>
            </button>
          </div>

          {/* Adaptive Coach Tip based on mood */}
          {member.todayMood === 'cansado' && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <Heart className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Consejo del Coach:</strong> No te castigues con cargas máximas hoy. Hacé series de bombeo controlado y descansá 90 segundos entre series. ¡Venir ya es ganar!
              </span>
            </div>
          )}
          {member.todayMood === 'adolorido' && (
            <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <Heart className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Cuidado:</strong> Si tenés dolor articular o muscular intenso, hacé 10 min de estiramientos suaves y avisale al profe de sala para adaptar el ejercicio.
              </span>
            </div>
          )}
          {member.todayMood === 'desmotivado' && (
            <div className="mt-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Fuerza mental:</strong> La disciplina es hacer lo que hay que hacer aunque no tengas ganas. Ponete los auriculares y arrancá con la primera serie, el resto fluye solo. 🔥
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Routine Days selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {routines.map((r, idx) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoutineIndex(idx)}
            id={`btn-select-trainee-day-${idx}`}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
              selectedRoutineIndex === idx
                ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span>{r.dayOfWeek}</span>
            <span className="text-[10px] font-normal opacity-80">({r.exercises.length} ej.)</span>
          </button>
        ))}
      </div>

      {/* Optional Embedded Rest Timer */}
      {showRestTimerWidget && (
        <RestTimer
          initialSeconds={activeTimerSeconds || 60}
          onClose={() => setShowRestTimerWidget(false)}
          autoStart={true}
        />
      )}

      {/* Completed celebration banner */}
      {justCompleted && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">¡Entrenamiento de Hoy Completado! 🔥</h3>
          <p className="text-xs text-neutral-300 max-w-md mx-auto">
            Excelente trabajo, {member.name}. Sumaste 1 día más a tu racha de constancia. El descanso y la buena comida ahora son tu prioridad.
          </p>
          <button
            onClick={() => setJustCompleted(false)}
            className="text-xs text-neutral-400 hover:text-white underline underline-offset-4 pt-1"
          >
            Ver o editar series del entrenamiento
          </button>
        </div>
      )}

      {/* Active Workout Progress Bar */}
      {currentRoutine && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-neutral-300">Progreso del entrenamiento</span>
            <span className="text-lime-400 font-mono font-bold">{percentDone}% ({completedSetsCount}/{totalSets} series)</span>
          </div>
          <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="bg-lime-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${percentDone}%` }}
            />
          </div>
        </div>
      )}

      {/* List of Exercises with interactive sets */}
      {currentRoutine && (
        <div className="space-y-4">
          {currentRoutine.exercises.map((exercise, exIdx) => {
            const completedSets = exercise.completedSets || Array(exercise.sets).fill(false);
            const isAllSetsDone = completedSets.every(Boolean);

            return (
              <div
                key={exercise.id || exIdx}
                id={`trainee-ex-card-${exercise.id || exIdx}`}
                className={`bg-neutral-900 border rounded-2xl p-4 transition-all ${
                  isAllSetsDone
                    ? 'border-emerald-500/40 bg-neutral-900/80'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Exercise Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-neutral-800 text-lime-400 flex items-center justify-center font-bold text-xs">
                        {exIdx + 1}
                      </span>
                      <h4 className="font-bold text-base text-white">{exercise.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 pl-8">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 border border-lime-400/20">
                        {exercise.muscleGroup}
                      </span>
                      <span className="text-xs text-neutral-400">
                        Objetivo: <strong className="text-white">{exercise.sets} series x {exercise.reps}</strong> ({exercise.targetWeightKg} kg)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTimerSeconds(exercise.restSeconds || 60);
                      setShowRestTimerWidget(true);
                    }}
                    id={`btn-timer-ex-${exIdx}`}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-lime-400 transition-colors flex items-center gap-1 text-xs"
                    title="Iniciar cronómetro de descanso"
                  >
                    <TimerIcon className="w-4 h-4 text-lime-400" />
                    <span className="hidden sm:inline font-mono">{exercise.restSeconds}s</span>
                  </button>
                </div>

                {exercise.notes && (
                  <div className="pl-8 mb-3 text-xs text-neutral-400 italic bg-neutral-950/40 p-2 rounded-lg border border-neutral-800/60">
                    💡 {exercise.notes}
                  </div>
                )}

                {/* Sets checkable row */}
                <div className="pl-8 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {Array.from({ length: exercise.sets }).map((_, setIdx) => {
                      const isDone = completedSets[setIdx] || false;
                      return (
                        <button
                          key={setIdx}
                          type="button"
                          onClick={() => handleToggleSet(exIdx, setIdx)}
                          id={`set-check-${exIdx}-${setIdx}`}
                          className={`py-2.5 px-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            isDone
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-sm shadow-emerald-500/10'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <span className="font-semibold">Serie {setIdx + 1}</span>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center ${
                              isDone ? 'bg-emerald-500 text-neutral-950' : 'border border-neutral-700'
                            }`}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Big Finish Button */}
      {currentRoutine && (
        <div className="pt-2">
          <button
            onClick={handleFinishWorkout}
            id="btn-finish-workout-today"
            className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-base flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-lime-400/20 active:scale-[0.99]"
          >
            <Trophy className="w-5 h-5" />
            <span>¡Completar Entrenamiento de Hoy!</span>
          </button>
        </div>
      )}
    </div>
  );
};
