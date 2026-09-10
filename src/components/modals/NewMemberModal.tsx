import React, { useState } from 'react';
import { X, UserPlus, Banknote, Smartphone, Check } from 'lucide-react';
import { GymMember, PaymentMethod } from '../../types';
import { normalizePhoneForWhatsApp } from '../../utils/storage';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: GymMember) => void;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({ isOpen, onClose, onAddMember }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+595 981 ');
  const [email, setEmail] = useState('');
  const [planName, setPlanName] = useState('Pase Libre Total Musculación');
  const [planPrice, setPlanPrice] = useState(180000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [paymentStatus, setPaymentStatus] = useState<'al_dia' | 'pendiente'>('al_dia');
  const [initialWeight, setInitialWeight] = useState<number>(75);
  const [goal, setGoal] = useState('Ganancia muscular y fuerza');
  const [injuries, setInjuries] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const nextDueDate = dueDate.toISOString().split('T')[0];

    const newMember: GymMember = {
      id: `mem_${Date.now()}`,
      name: name.trim(),
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}?auto=format&fit=crop&w=250&q=80`,
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      phone: phone.trim(),
      memberSince: 'Hoy',
      planName,
      planPrice: Number(planPrice),
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
          amount: Number(planPrice),
          method: paymentMethod,
          period: 'Mes actual',
          receiptNote: `Pago inicial de inscripción (${paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'})`,
          verified: true
        }
      ] : [],
      routines: [
        {
          id: `rout_${Date.now()}`,
          dayOfWeek: 'Lunes',
          title: 'Full Body de Iniciación',
          durationMin: 45,
          completedToday: false,
          exercises: [
            {
              id: `ex_init_1`,
              name: 'Prensa de Piernas 45°',
              muscleGroup: 'Piernas',
              sets: 3,
              reps: '12',
              targetWeightKg: 50,
              restSeconds: 60,
              notes: 'Movimiento fluido y controlado.',
              completedSets: [false, false, false]
            },
            {
              id: `ex_init_2`,
              name: 'Jalón al Pecho en Polea',
              muscleGroup: 'Espalda',
              sets: 3,
              reps: '12',
              targetWeightKg: 30,
              restSeconds: 60,
              notes: 'Espalda derecha, activar dorsales.',
              completedSets: [false, false, false]
            },
            {
              id: `ex_init_3`,
              name: 'Press de Banca Plano con Barra',
              muscleGroup: 'Pecho',
              sets: 3,
              reps: '10',
              targetWeightKg: 30,
              restSeconds: 75,
              notes: 'Empuje parejo.',
              completedSets: [false, false, false]
            }
          ]
        }
      ],
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
              <h2 className="text-lg font-bold text-white">Nuevo Socio / Atleta</h2>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Plan de Membresía
              </label>
              <select
                value={planName}
                onChange={(e) => {
                  setPlanName(e.target.value);
                  if (e.target.value === 'Pase Libre Total Musculación') setPlanPrice(180000);
                  if (e.target.value === '3 Días por Semana') setPlanPrice(150000);
                  if (e.target.value === 'Musculación + Funcional') setPlanPrice(200000);
                  if (e.target.value === 'Pase Diario / Semanal') setPlanPrice(35000);
                }}
                id="select-member-plan"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              >
                <option value="Pase Libre Total Musculación">Pase Libre Total (₲ 180.000)</option>
                <option value="3 Días por Semana">3 Días por Semana (₲ 150.000)</option>
                <option value="Musculación + Funcional">Musculación + Funcional (₲ 200.000)</option>
                <option value="Pase Diario / Semanal">Pase Diario / Semanal (₲ 35.000)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Precio de Cuota (₲ Guaraníes)
              </label>
              <input
                type="number"
                value={planPrice}
                onChange={(e) => setPlanPrice(Number(e.target.value))}
                required
                id="input-member-price"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 font-mono"
              />
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
              id="btn-submit-new-member"
              className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-lime-400/20"
            >
              Crear y Activar Socio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
