import React, { useEffect, useState } from 'react';
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
  ArrowLeft,
  Check,
  HelpCircle,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';
import { AuthUser, GymMember, UserRole } from '../../types';
import {
  loginUser,
  registerStudent,
} from '../../utils/auth';
import { tenantDisplayHost } from '../../utils/tenant';

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
  const [tab, setTab] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [brand, setBrand] = useState<{ gymName?: string; logoUrl?: string }>({});
  useEffect(() => {
    fetch('/api/branding')
      .then((res) => (res.ok ? res.json() : {}))
      .then(setBrand)
      .catch(() => setBrand({}));
  }, []);
  const displayGymName = brand.gymName || gymName;

  // Only students self-register (QR at the gym). Trainer accounts are created by the owner and
  // owner accounts are provisioned on the server.
  const canRegister = currentPortal === 'student';
  useEffect(() => {
    if (!canRegister && tab === 'register') setTab('login');
  }, [canRegister, tab]);

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
      } else {
        setRegError('Las cuentas de profesor las crea el dueño del gimnasio desde su portal.');
      }
    } catch (err: any) {
      setRegError(err.message || 'Error al procesar registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentHost = typeof window !== 'undefined' && window.location.host ? tenantDisplayHost() : 'gymbro.app';

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
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={`Logo de ${displayGymName}`}
              className="w-16 h-16 rounded-2xl object-contain bg-white p-1 shadow-xl mx-auto"
            />
          ) : (
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mx-auto font-black ${
            currentPortal === 'student'
              ? 'bg-lime-400 text-neutral-950 shadow-lime-400/20'
              : currentPortal === 'trainer'
              ? 'bg-cyan-400 text-neutral-950 shadow-cyan-400/20'
              : 'bg-amber-400 text-neutral-950 shadow-amber-400/20'
          }`}>
            <CurrentIcon className="w-8 h-8 stroke-[2.5]" />
          </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-['Syne',sans-serif]">
            {portalConfig.label}
          </h1>
          <p className="text-xs text-neutral-400">
            {displayGymName} • {portalConfig.sublabel}
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
                  : tab === 'forgot_password'
                  ? 'El gimnasio puede asignarte una contraseña nueva sin que pierdas tu progreso.'
                  : 'Completa tus datos para registrarte directamente en el sistema.'}
              </span>
            </div>
          </div>

          {/* Tabs: Iniciar Sesión / Registrarse (hidden when in forgot_password mode) */}
          {tab !== 'forgot_password' ? (
            <div className={`grid ${canRegister ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 text-xs font-bold`}>
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

              {canRegister && (
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
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="flex items-center gap-2 px-1">
                <KeyRound className="w-4 h-4 text-lime-400" />
                <span className="text-xs font-bold text-white">Recuperación de Contraseña</span>
              </div>
              <button
                type="button"
                onClick={() => setTab('login')}
                className="py-1 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Login</span>
              </button>
            </div>
          )}

          {/* FORGOT PASSWORD: only the gym can reset it */}
          {tab === 'forgot_password' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2 leading-relaxed">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-lime-400" />
                  <span>¿Olvidaste tu contraseña?</span>
                </div>
                <p>
                  {currentPortal === 'owner'
                    ? 'La contraseña de Dueño / Administración no se recupera desde la web: contacta al soporte técnico.'
                    : `Por seguridad, la contraseña solo la puede restablecer ${gymName}. Pedile en recepción que te asigne una nueva desde el portal del dueño (Enlaces → Cuentas) y después ingresá con ella.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTab('login')}
                className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          ) : tab === 'login' ? (
            <div className="space-y-4">
              {/* Portal access hint */}
              <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Acceso al Portal
                  </span>
                </div>

                {currentPortal === 'owner' ? (
                  <div className="text-[11px] text-neutral-400 p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800/80 leading-relaxed">
                    Acceso exclusivo para la administración del gimnasio. Ingresa con el usuario y la contraseña de dueño que te entregó el soporte técnico.
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-400 p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800/80 leading-relaxed">
                    {currentPortal === 'trainer' ? (
                      <span>
                        Ingresa con el usuario y la contraseña de profesor que te creó el dueño del gimnasio.
                      </span>
                    ) : (
                      <span>
                        Ingresa abajo con tu usuario o WhatsApp registrado, o haz clic en <strong className="text-lime-400">"Crear Cuenta"</strong> para darte de alta en el gimnasio.
                      </span>
                    )}
                  </div>
                )}
              </div>

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
                    <span>Usuario o Nombre</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={
                      currentPortal === 'owner'
                        ? 'Tu usuario de administración'
                        : currentPortal === 'trainer'
                        ? 'Tu usuario de profesor'
                        : 'Tu usuario'
                    }
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
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                    id="input-login-password"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                  />
                </div>

                {/* Forgot password link */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-neutral-500">¿Acceso bloqueado o cerrado?</span>
                  <button
                    type="button"
                    onClick={() => setTab('forgot_password')}
                    id="btn-forgot-password-link"
                    className="text-lime-400 hover:text-lime-300 font-bold hover:underline transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-login"
                  className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Verificando...' : `Ingresar al ${portalConfig.label}`}</span>
                </button>

                {onOpenLinksModal && currentPortal === 'owner' && (
                  <button
                    type="button"
                    onClick={onOpenLinksModal}
                    id="btn-delivery-guide"
                    className="w-full py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>¿Cómo entregar los enlaces a tu cliente sin pantallas de Google?</span>
                  </button>
                )}

                {canRegister && (
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
                )}
              </form>
            </div>
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
                        placeholder="Mínimo 6 caracteres"
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
