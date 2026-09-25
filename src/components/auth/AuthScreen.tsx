import React, { useState } from 'react';
import {
  Dumbbell,
  Lock,
  User,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Globe,
  KeyRound,
  Phone,
  Target,
  Share2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AuthUser, GymMember, UserRole } from '../../types';
import { loginUser, registerStudent, registerTrainer, registerOwner, getStoredUsers } from '../../utils/auth';

interface AuthScreenProps {
  currentPortal: 'student' | 'trainer' | 'owner';
  onChangePortal: (portal: 'student' | 'trainer' | 'owner') => void;
  onAuthSuccess: (user: AuthUser, newMemberCreated?: GymMember) => void;
  gymName?: string;
  onOpenLinksModal?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  currentPortal,
  onChangePortal,
  onAuthSuccess,
  gymName = 'GymBro Fitness Center',
  onOpenLinksModal,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Student state
  const [regStudentName, setRegStudentName] = useState('');
  const [regStudentUsername, setRegStudentUsername] = useState('');
  const [regStudentPassword, setRegStudentPassword] = useState('');
  const [regStudentPhone, setRegStudentPhone] = useState('+595 981 ');
  const [regStudentGoal, setRegStudentGoal] = useState('Hipertrofia y aumento de fuerza');
  const [regStudentPaymentMethod, setRegStudentPaymentMethod] = useState<'efectivo' | 'transferencia'>('transferencia');

  // Register Trainer state
  const [regTrainerName, setRegTrainerName] = useState('');
  const [regTrainerUsername, setRegTrainerUsername] = useState('');
  const [regTrainerPassword, setRegTrainerPassword] = useState('');
  const [regTrainerSpecialty, setRegTrainerSpecialty] = useState('Musculación y Fuerza');

  // Register Owner state
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regOwnerUsername, setRegOwnerUsername] = useState('');
  const [regOwnerPassword, setRegOwnerPassword] = useState('');

  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const result = await loginUser(loginUsername, loginPassword, currentPortal);
      if (result.success && result.user) {
        onAuthSuccess(result.user);
      } else {
        setLoginError(result.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setIsSubmitting(true);

    try {
      if (currentPortal === 'student') {
        const result = await registerStudent({
          name: regStudentName,
          username: regStudentUsername,
          password: regStudentPassword,
          phone: regStudentPhone,
          goal: regStudentGoal,
          paymentMethod: regStudentPaymentMethod,
        });

        if (result.success && result.user) {
          onAuthSuccess(result.user, result.newMember);
        } else {
          setRegError(result.error || 'Error al registrar alumno');
        }
      } else if (currentPortal === 'trainer') {
        const result = await registerTrainer({
          name: regTrainerName,
          username: regTrainerUsername,
          password: regTrainerPassword,
          specialty: regTrainerSpecialty,
        });

        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setRegError(result.error || 'Error al registrar entrenador');
        }
      } else {
        const result = await registerOwner({
          name: regOwnerName,
          username: regOwnerUsername,
          password: regOwnerPassword,
        });

        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setRegError(result.error || 'Error al registrar dueño');
        }
      }
    } catch (err: any) {
      setRegError(err.message || 'Error al procesar registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentHost = typeof window !== 'undefined' && window.location.host ? window.location.host : 'gymbro.app';

  const portalConfig = {
    student: {
      label: 'Portal de Alumnos',
      sublabel: 'Rutinas diarias, progreso y membresía',
      path: `${currentHost}/#/alumno`,
      badge: 'Alumno',
      badgeColor: 'text-lime-400 border-lime-400/20 bg-lime-400/10',
      icon: Smartphone,
    },
    trainer: {
      label: 'Portal de Entrenadores',
      sublabel: 'Planificación técnica, rutinas y atletas',
      path: `${currentHost}/#/coach`,
      badge: 'Entrenador',
      badgeColor: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10',
      icon: Dumbbell,
    },
    owner: {
      label: 'Portal de Dueño & Administración',
      sublabel: 'Caja diaria, cobros y administración general',
      path: `${currentHost}/#/dueno`,
      badge: 'Dueño / Admin',
      badgeColor: 'text-amber-400 border-amber-400/20 bg-amber-400/10',
      icon: ShieldCheck,
    },
  }[currentPortal];

  const CurrentIcon = portalConfig.icon;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-lime-400 selection:text-neutral-950 font-sans p-4 sm:p-6">
      {/* Top Header with Direct Link Badge */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 py-1.5 px-3 rounded-full text-xs text-neutral-300">
          <Globe className="w-3.5 h-3.5 text-lime-400" />
          <span className="font-mono font-bold text-white tracking-wide">{portalConfig.path}</span>
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse ml-1" />
        </div>

        <div className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${portalConfig.badgeColor}`}>
          Acceso: {portalConfig.badge}
        </div>
      </div>

      {/* Main Card Container */}
      <div className="max-w-md w-full mx-auto my-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mx-auto font-black ${
            currentPortal === 'student'
              ? 'bg-lime-400 text-neutral-950 shadow-lime-400/20'
              : currentPortal === 'trainer'
              ? 'bg-cyan-400 text-neutral-950 shadow-cyan-400/20'
              : 'bg-amber-400 text-neutral-950 shadow-amber-400/20'
          }`}>
            <CurrentIcon className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-['Syne',sans-serif]">
            {portalConfig.label}
          </h1>
          <p className="text-xs text-neutral-400">
            {gymName} • {portalConfig.sublabel}
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-white block font-bold">Acceso a {portalConfig.label}</strong>
              <span className="text-neutral-400">
                {tab === 'login'
                  ? 'Si ya tienes cuenta o el gimnasio te asignó un usuario, ingresa abajo con tus datos.'
                  : 'Completa tus datos para registrarte directamente en el sistema.'}
              </span>
            </div>
          </div>

          {/* Tabs: Iniciar Sesión / Registrarse */}
          <div className="grid grid-cols-2 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setLoginError(null);
              }}
              id="auth-tab-login"
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                tab === 'login'
                  ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('register');
                setRegError(null);
              }}
              id="auth-tab-register"
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                tab === 'register'
                  ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Crear Cuenta</span>
            </button>
          </div>

          {/* Form: LOGIN */}
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-lime-400" />
                  <span>Usuario o Correo Electrónico</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Tu usuario o correo"
                  autoComplete="username"
                  id="input-login-username"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-lime-400" />
                  <span>Contraseña</span>
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu contraseña secreta"
                  autoComplete="current-password"
                  id="input-login-password"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                id="btn-submit-login"
                className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Verificando...' : `Ingresar al ${portalConfig.label}`}</span>
              </button>

              <p className="text-[11px] text-center text-neutral-400 pt-1">
                ¿No tienes cuenta? Haz clic en la pestaña{' '}
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="text-lime-400 font-bold underline hover:text-lime-300 ml-1"
                >
                  Crear Cuenta
                </button>
              </p>
            </form>
          ) : (
            /* Form: REGISTER */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Student Registration Fields */}
              {currentPortal === 'student' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={regStudentName}
                      onChange={(e) => setRegStudentName(e.target.value)}
                      placeholder="Ej: Marcelo Gómez"
                      id="input-reg-student-name"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Usuario *</label>
                      <input
                        type="text"
                        required
                        value={regStudentUsername}
                        onChange={(e) => setRegStudentUsername(e.target.value)}
                        placeholder="ej: marcelo"
                        id="input-reg-student-username"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Contraseña *</label>
                      <input
                        type="password"
                        required
                        value={regStudentPassword}
                        onChange={(e) => setRegStudentPassword(e.target.value)}
                        placeholder="Mínimo 3 caracteres"
                        id="input-reg-student-password"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-lime-400" />
                      <span>Teléfono / WhatsApp</span>
                    </label>
                    <input
                      type="text"
                      value={regStudentPhone}
                      onChange={(e) => setRegStudentPhone(e.target.value)}
                      placeholder="+595 981 123456"
                      id="input-reg-student-phone"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-lime-400" />
                      <span>Objetivo de Entrenamiento</span>
                    </label>
                    <select
                      value={regStudentGoal}
                      onChange={(e) => setRegStudentGoal(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    >
                      <option value="Hipertrofia y aumento de fuerza">Hipertrofia y aumento de fuerza</option>
                      <option value="Pérdida de grasa y definición">Pérdida de grasa y definición</option>
                      <option value="Salud, acondicionamiento y movilidad">Salud, acondicionamiento y movilidad</option>
                      <option value="Rendimiento deportivo">Rendimiento deportivo</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Preferencia de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegStudentPaymentMethod('transferencia')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          regStudentPaymentMethod === 'transferencia'
                            ? 'bg-lime-400/20 border-lime-400 text-lime-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        📲 Transferencia
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStudentPaymentMethod('efectivo')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          regStudentPaymentMethod === 'efectivo'
                            ? 'bg-lime-400/20 border-lime-400 text-lime-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        💵 Efectivo
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Trainer Registration Fields */}
              {currentPortal === 'trainer' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Nombre del Entrenador *</label>
                    <input
                      type="text"
                      required
                      value={regTrainerName}
                      onChange={(e) => setRegTrainerName(e.target.value)}
                      placeholder="Ej: Prof. Diego Ruiz"
                      id="input-reg-trainer-name"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Usuario *</label>
                      <input
                        type="text"
                        required
                        value={regTrainerUsername}
                        onChange={(e) => setRegTrainerUsername(e.target.value)}
                        placeholder="ej: diego"
                        id="input-reg-trainer-username"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Contraseña *</label>
                      <input
                        type="password"
                        required
                        value={regTrainerPassword}
                        onChange={(e) => setRegTrainerPassword(e.target.value)}
                        placeholder="Mínimo 3 caracteres"
                        id="input-reg-trainer-password"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Especialidad</label>
                    <input
                      type="text"
                      value={regTrainerSpecialty}
                      onChange={(e) => setRegTrainerSpecialty(e.target.value)}
                      placeholder="Ej: Musculación, Fuerza y Powerlifting"
                      id="input-reg-trainer-specialty"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </>
              )}

              {/* Owner Registration Fields */}
              {currentPortal === 'owner' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Nombre del Dueño *</label>
                    <input
                      type="text"
                      required
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="Ej: Fernando Cáceres"
                      id="input-reg-owner-name"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Usuario *</label>
                      <input
                        type="text"
                        required
                        value={regOwnerUsername}
                        onChange={(e) => setRegOwnerUsername(e.target.value)}
                        placeholder="ej: dueno"
                        id="input-reg-owner-username"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Contraseña *</label>
                      <input
                        type="password"
                        required
                        value={regOwnerPassword}
                        onChange={(e) => setRegOwnerPassword(e.target.value)}
                        placeholder="Mínimo 3 caracteres"
                        id="input-reg-owner-password"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                id="btn-submit-register"
                className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Registrando...' : `Crear Cuenta de ${portalConfig.badge}`}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-neutral-500">
          <p>GymBro App • Cada rol cuenta con su enlace independiente y seguro</p>
        </div>
      </div>

      <div className="py-2" />
    </div>
  );
};
