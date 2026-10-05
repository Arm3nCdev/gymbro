import React, { useState, useEffect } from 'react';
import { X, UserPlus, Banknote, Smartphone, Check, KeyRound, Lock, Sparkles, Share2, Dumbbell, UserCheck, Clock, Sun, Moon } from 'lucide-react';
import { GymMember, PaymentMethod } from '../../types';
import { normalizePhoneForWhatsApp, createWhatsAppLink, formatCurrency } from '../../utils/storage';
import { directCreateUserByOwner, getRegisteredTrainers } from '../../utils/auth';
import { generateDefaultWeeklySplit } from '../../data/initialData';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: GymMember) => void;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({ isOpen, onClose, onAddMember }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+595 981 ');
  const [email, setEmail] = useState('');

  // Membership & Trainer Assignment
  const [membershipType, setMembershipType] = useState<'mensual' | 'diario'>('mensual');
  const [baseMembershipPrice, setBaseMembershipPrice] = useState<number>(150000);
  const [hasPersonalTrainer, setHasPersonalTrainer] = useState(false);
  const [personalTrainerPrice, setPersonalTrainerPrice] = useState<number>(100000);
  const [assignedTrainerName, setAssignedTrainerName] = useState<string>('');
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [trainingShift, setTrainingShift] = useState<'mañana' | 'tarde' | 'noche' | 'libre'>('mañana');
  const [trainingScheduleNote, setTrainingScheduleNote] = useState<string>('08:00 a 09:30 hs');
  const [availableTrainers, setAvailableTrainers] = useState<{ id: string; name: string; specialty?: string }[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [paymentStatus, setPaymentStatus] = useState<'al_dia' | 'pendiente'>('al_dia');
  const [initialWeight, setInitialWeight] = useState<number>(75);
  const [goal, setGoal] = useState('Ganancia muscular y fuerza');
  const [injuries, setInjuries] = useState('');

  // App login credentials for the student
  const [assignAppAccess, setAssignAppAccess] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('gym123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdNotice, setCreatedNotice] = useState<{ username: string; pass: string; phone: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      getRegisteredTrainers().then((trainers) => {
        setAvailableTrainers(trainers);
        if (trainers.length > 0 && !assignedTrainerName) {
          setAssignedTrainerName(trainers[0].name);
        }
      });
    }
  }, [isOpen]);

  const computedTotal = (membershipType === 'diario' ? Number(baseMembershipPrice || 20000) : Number(baseMembershipPrice || 150000)) +
    (hasPersonalTrainer ? Number(personalTrainerPrice || 0) : 0);

  if (!isOpen) return null;

  const setCountryPrefix = (prefix: string) => {
    // Keep numbers entered if any, swap prefix
    const digits = phone.replace(/[^0-9]/g, '');
    if (prefix.includes('595')) {
      setPhone('+595 981 ');
    } else if (prefix.includes('54')) {
      setPhone('+54 9 11 ');
    } else {
      setPhone(prefix);
    }
  };

  const detectedWhatsApp = normalizePhoneForWhatsApp(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (membershipType === 'diario' ? 1 : 30));
    const nextDueDate = dueDate.toISOString().split('T')[0];

    const cleanUsername = (
      loginUsername.trim() ||
      name.trim().toLowerCase().split(' ')[0] ||
      `alumno_${Date.now().toString().slice(-4)}`
    ).replace(/[^a-z0-9._]/g, '');

    const cleanPassword = loginPassword.trim() || 'gym123';

    const finalPlanName = hasPersonalTrainer
      ? `${membershipType === 'diario' ? 'Pase Diario' : 'Membresía Mensual'} + Personalizado (${assignedTrainerName} - Turno ${
          trainingShift === 'mañana' ? 'Mañana' : trainingShift === 'tarde' ? 'Tarde' : trainingShift === 'noche' ? 'Noche' : 'Libre'
        })`
      : `${membershipType === 'diario' ? 'Pase Diario' : 'Pase Libre Mensual'} (Por su cuenta)`;

    const selectedTrainerObj = availableTrainers.find(
      (t) => t.name.toLowerCase() === assignedTrainerName.trim().toLowerCase()
    );
    if (hasPersonalTrainer && !selectedTrainerObj) {
      setTrainerError('Elegí un profesor. Si todavía no hay, crealo en Enlaces → Crear Usuario.');
      return;
    }
    setTrainerError(null);

    if (assignAppAccess) {
      setIsSubmitting(true);
      try {
        const result = await directCreateUserByOwner({
          name: name.trim(),
          username: cleanUsername,
          password: cleanPassword,
          role: 'student',
          phone: phone.trim(),
          email: email.trim() || `${cleanUsername}@gymbro.app`,
          planPrice: computedTotal,
        });

        if (result.success && result.member) {
          const enhancedMember: GymMember = {
            ...result.member,
            planName: finalPlanName,
            planPrice: computedTotal,
            membershipType,
            baseMembershipPrice: Number(baseMembershipPrice),
            hasPersonalTrainer,
            personalTrainerPrice: hasPersonalTrainer ? Number(personalTrainerPrice) : 0,
            assignedTrainerId: hasPersonalTrainer ? (selectedTrainerObj?.id || `usr_trainer_${assignedTrainerName.toLowerCase()}`) : undefined,
            assignedTrainerName: hasPersonalTrainer ? assignedTrainerName.trim() : undefined,
            trainingShift: hasPersonalTrainer ? trainingShift : 'libre',
            trainingScheduleNote: hasPersonalTrainer ? trainingScheduleNote : undefined,
          };
          onAddMember(enhancedMember);
          onClose();
          return;
        }
      } catch (err) {
        console.warn('Direct create fallback:', err);
      } finally {
        setIsSubmitting(false);
      }
    }

    const newMemberId = `mem_${Date.now()}`;
    const newMember: GymMember = {
      id: newMemberId,
      name: name.trim(),
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}?auto=format&fit=crop&w=250&q=80`,
      email: email.trim() || `${cleanUsername}@email.com`,
      phone: phone.trim(),
      memberSince: 'Hoy',
      planName: finalPlanName,
      planPrice: computedTotal,
      membershipType,
      baseMembershipPrice: Number(baseMembershipPrice),
      hasPersonalTrainer,
      personalTrainerPrice: hasPersonalTrainer ? Number(personalTrainerPrice) : 0,
      assignedTrainerId: hasPersonalTrainer ? (selectedTrainerObj?.id || `usr_trainer_${assignedTrainerName.toLowerCase()}`) : undefined,
      assignedTrainerName: hasPersonalTrainer ? assignedTrainerName.trim() : undefined,
      trainingShift: hasPersonalTrainer ? trainingShift : 'libre',
      trainingScheduleNote: hasPersonalTrainer ? trainingScheduleNote : undefined,
      paymentMethod,
      paymentStatus,
      nextDueDate,
      daysAbsent: 0,
      streakDays: 1,
      lastAttended: 'Hoy',
      goal,
      injuriesNotes: injuries.trim() || 'Sin lesiones reportadas.',
      todayMood: 'energia',
      todayWorkoutCompleted: false,
      paymentsHistory: paymentStatus === 'al_dia' ? [
        {
          id: `pay_${Date.now()}`,
          date: today,
          amount: computedTotal,
          method: paymentMethod,
          period: membershipType === 'diario' ? 'Pase Diario' : 'Mes actual',
          receiptNote: `Inscripción inicial (${hasPersonalTrainer ? `Membresía + Personalizado Profe ${assignedTrainerName}` : 'Membresía Libre'}) - ${paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}`,
          verified: true
        }
      ] : [],
      routines: generateDefaultWeeklySplit(newMemberId),
      weightHistory: initialWeight ? [
        {
          id: `w_${Date.now()}`,
          date: today,
          weightKg: Number(initialWeight),
          note: 'Pesaje inicial al inscribirse'
        }
      ] : [],
      photos: [],
      messages: [
        {
          id: `msg_welcome_${Date.now()}`,
          type: 'workout_reminder',
          title: '¡Bienvenido/a a la familia GymBro! 🏋️‍♂️',
          content: `¡Hola ${name}! Ya tenés tu rutina de bienvenida configurada. Cualquier duda con las máquinas o técnica, pedile una mano al profe de sala. ¡A darle con todo!`,
          date: 'Hoy',
          sender: 'GymBro',
          read: false
        }
      ]
    };

    onAddMember(newMember);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="new-member-modal"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nuevo Alumno</h2>
              <p className="text-xs text-neutral-400">Registrar nuevo alumno en el gimnasio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-new-member"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
                id="input-member-name"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  WhatsApp / Teléfono *
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCountryPrefix('+595 981 ')}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Prefijo Paraguay"
                  >
                    🇵🇾 +595
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountryPrefix('+54 9 11 ')}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Prefijo Argentina"
                  >
                    🇦🇷 +54
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 0981 123456 ó +595 981 123456"
                required
                id="input-member-phone"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              />
              {detectedWhatsApp && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-lime-400/90 font-mono">
                  <Smartphone className="w-3 h-3" />
                  <span>WhatsApp: +{detectedWhatsApp}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                id="input-member-email"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Peso Inicial (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={initialWeight}
                onChange={(e) => setInitialWeight(Number(e.target.value))}
                placeholder="75.0"
                id="input-member-weight"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>
          </div>

          {/* Modalidad de Membresía y Asignación de Profesor */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-lime-400" />
                Membresía del Gimnasio & Asignación de Profesor
              </span>
              <span className="text-[10px] text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-full font-semibold">
                Relación 1 a N
              </span>
            </div>

            {/* Tipo de Membresía Base */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Tipo de Membresía Base
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMembershipType('mensual');
                      if (baseMembershipPrice === 20000) setBaseMembershipPrice(150000);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                      membershipType === 'mensual'
                        ? 'bg-lime-400/15 border-lime-400 text-lime-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    🗓️ Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMembershipType('diario');
                      if (baseMembershipPrice === 150000) setBaseMembershipPrice(20000);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                      membershipType === 'diario'
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    🎟️ Pase Diario
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Valor Membresía Base (₲)
                </label>
                <input
                  type="number"
                  value={baseMembershipPrice}
                  onChange={(e) => setBaseMembershipPrice(Number(e.target.value))}
                  placeholder="150000"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400 font-mono"
                />
              </div>
            </div>

            {/* Checkbox: Entrenamiento Personalizado con Profesor */}
            <div className="pt-2 border-t border-neutral-850">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPersonalTrainer}
                  onChange={(e) => setHasPersonalTrainer(e.target.checked)}
                  className="w-4 h-4 rounded accent-lime-400 cursor-pointer"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  ¿Contrata Entrenamiento Personalizado con Profesor? (Aparte)
                </span>
              </label>
              <p className="text-[11px] text-neutral-400 ml-6 mt-0.5">
                {hasPersonalTrainer
                  ? 'El alumno tendrá un profesor asignado para personalizar su rutina y pagará un adicional aparte.'
                  : 'El alumno entra a entrenar por su cuenta pagando únicamente la membresía estándar.'}
              </p>
            </div>

            {/* Si tiene profesor asignado: campos de entrenador, turno y cuota aparte */}
            {hasPersonalTrainer && (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-300 mb-1">
                      Profesor Asignado
                    </label>
                    <select
                      value={assignedTrainerName}
                      onChange={(e) => setAssignedTrainerName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                    >
                      {availableTrainers.map((t) => (
                        <option key={t.id} value={t.name}>
                          Profe {t.name} {t.specialty ? `(${t.specialty})` : ''}
                        </option>
                      ))}
                      {availableTrainers.length === 0 && <option value="">No hay profesores creados</option>}
                    </select>
                    {(trainerError || availableTrainers.length === 0) && (
                      <p className="text-[11px] text-amber-300 mt-1">
                        {trainerError || 'Todavía no hay profesores: crealos en Enlaces → Crear Usuario.'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-300 mb-1">
                      Turno de Entrenamiento
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTrainingShift('mañana')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          trainingShift === 'mañana'
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" /> Mañana
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrainingShift('tarde')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          trainingShift === 'tarde'
                            ? 'bg-orange-400/20 border-orange-400 text-orange-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" /> Tarde
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrainingShift('noche')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          trainingShift === 'noche'
                            ? 'bg-indigo-400/20 border-indigo-400 text-indigo-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" /> Noche
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Cuota Aparte por Personalización (₲)
                    </label>
                    <input
                      type="number"
                      value={personalTrainerPrice}
                      onChange={(e) => setPersonalTrainerPrice(Number(e.target.value))}
                      placeholder="100000"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" /> Horario habitual (opcional)
                    </label>
                    <input
                      type="text"
                      value={trainingScheduleNote}
                      onChange={(e) => setTrainingScheduleNote(e.target.value)}
                      placeholder="Ej: 07:30 a 09:00 hs"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Desglose de Cobro Total */}
            <div className="bg-neutral-900/90 border border-lime-400/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5 text-neutral-300 text-left w-full sm:w-auto">
                <span className="font-semibold text-white">Desglose de cuota: </span>
                <span className="text-neutral-400">
                  Membresía ({formatCurrency(baseMembershipPrice)})
                  {hasPersonalTrainer ? ` + Personalizado Profe ${assignedTrainerName} (${formatCurrency(personalTrainerPrice)})` : ' (Entrena por su cuenta)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <span className="text-neutral-400 text-xs">Total:</span>
                <span className="text-base font-black text-lime-400 font-mono">
                  {formatCurrency(computedTotal)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Método de Pago Habitual (Efectivo / Transferencia)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                id="btn-new-method-cash"
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  paymentMethod === 'efectivo'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                <Banknote className="w-4 h-4" /> 💵 Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transferencia')}
                id="btn-new-method-transfer"
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  paymentMethod === 'transferencia'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                <Smartphone className="w-4 h-4" /> 📲 Transferencia
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Estado de Pago Inicial
            </label>
            <div className="flex gap-4 text-sm text-neutral-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="initPayment"
                  checked={paymentStatus === 'al_dia'}
                  onChange={() => setPaymentStatus('al_dia')}
                  className="accent-lime-400"
                />
                <span>🟢 Abonó primera cuota (Al día)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="initPayment"
                  checked={paymentStatus === 'pendiente'}
                  onChange={() => setPaymentStatus('pendiente')}
                  className="accent-lime-400"
                />
                <span>🔴 Pago pendiente</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Objetivo Fitness
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ej. Hipertrofia, Pérdida de grasa, Salud general..."
              id="input-member-goal"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Lesiones o Cuidados Especiales
            </label>
            <input
              type="text"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="Ej. Molestia en hombro izquierdo, dolor lumbar..."
              id="input-member-injuries"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
            />
          </div>

          {/* App Access Credentials */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-lime-400" />
                <span className="text-xs font-bold text-white">Acceso a la App para el Alumno</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignAppAccess}
                  onChange={(e) => setAssignAppAccess(e.target.checked)}
                  className="accent-lime-400 rounded"
                />
                <span>Habilitar usuario de acceso</span>
              </label>
            </div>

            {assignAppAccess && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Usuario de Login *
                  </label>
                  <input
                    type="text"
                    required={assignAppAccess}
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={name ? name.toLowerCase().split(' ')[0] : 'ej: alumno'}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required={assignAppAccess}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="gym123"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 font-mono"
                  />
                </div>
                <p className="sm:col-span-2 text-[11px] text-neutral-400">
                  El alumno podrá entrar desde su celular en el link de alumnos (<strong>/#/alumno</strong>) con este usuario y contraseña.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              id="btn-cancel-new-member"
              className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-submit-new-member"
              className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-lime-400/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando...' : 'Crear y Activar Alumno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
