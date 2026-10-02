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
  registerTrainer,
  registerOwner,
  getStoredUsers,
  findUserForRecovery,
  resetUserPassword,
} from '../../utils/auth';

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

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Recovery state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'find' | 'reset'>('find');
  const [forgotFoundUser, setForgotFoundUser] = useState<Partial<AuthUser> | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);

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

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setIsRecovering(true);

    try {
      const res = await findUserForRecovery(forgotIdentifier, currentPortal);
      if (res.success && res.user) {
        setForgotFoundUser(res.user);
        setForgotStep('reset');
      } else {
        setForgotError(res.error || 'No se encontró ninguna cuenta con esos datos.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Error al buscar cuenta');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (forgotNewPassword.length < 3) {
      setForgotError('La contraseña debe tener al menos 3 caracteres.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Las contraseñas no coinciden. Escríbelas exactamente iguales.');
      return;
    }

    setIsRecovering(true);
    try {
      const targetId = forgotFoundUser?.username || forgotIdentifier;
      const res = await resetUserPassword(targetId, forgotNewPassword, currentPortal);
      if (res.success && res.user) {
        setForgotSuccess('¡Contraseña restablecida con éxito! Ingresando...');
        setTimeout(() => {
          onAuthSuccess(res.user!);
        }, 900);
      } else {
        setForgotError(res.error || 'No se pudo actualizar la contraseña.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Error inesperado al restablecer.');
    } finally {
      setIsRecovering(false);
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
                  : tab === 'forgot_password'
                  ? 'Recupera o restablece tu contraseña para volver a entrar a tu portal sin perder tu progreso.'
                  : 'Completa tus datos para registrarte directamente en el sistema.'}
              </span>
            </div>
          </div>

          {/* Tabs: Iniciar Sesión / Registrarse (hidden when in forgot_password mode) */}
          {tab !== 'forgot_password' ? (
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
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="flex items-center gap-2 px-1">
                <KeyRound className="w-4 h-4 text-lime-400" />
                <span className="text-xs font-bold text-white">Recuperación de Contraseña</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setForgotError(null);
                  setForgotSuccess(null);
                }}
                className="py-1 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Login</span>
              </button>
            </div>
          )}

          {/* Form: FORGOT PASSWORD */}
          {tab === 'forgot_password' ? (
            <div className="space-y-4">
              {forgotStep === 'find' ? (
                <form onSubmit={handleFindAccount} className="space-y-4">
                  {forgotError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-lime-400" />
                      <span>Identificador de tu Cuenta</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder={
                        currentPortal === 'student'
                          ? 'Tu usuario, WhatsApp (+595...) o tu nombre'
                          : currentPortal === 'trainer'
                          ? 'Tu usuario de entrenador o correo'
                          : 'Tu usuario de dueño (ej. rony) o correo'
                      }
                      autoFocus
                      id="input-forgot-identifier"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
                    <div className="font-bold text-neutral-300 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-lime-400" />
                      <span>¿Cómo recuperar si olvidaste tus datos de acceso?</span>
                    </div>
                    <p>
                      {currentPortal === 'student'
                        ? 'Ingresa tu usuario, tu WhatsApp o tu nombre completo. El sistema verificará tu cuenta de alumno para que elijas una nueva contraseña de inmediato.'
                        : currentPortal === 'trainer'
                        ? 'Ingresa tu usuario de entrenador o correo para restablecer tu contraseña y retomar tus atletas.'
                        : 'Ingresa tu usuario ("rony") o tu correo para restablecer la contraseña de dueño.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isRecovering}
                    id="btn-submit-find-account"
                    className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 active:scale-[0.99] disabled:opacity-50"
                  >
                    {isRecovering ? (
                      <span>Buscando cuenta...</span>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Buscar Mi Cuenta</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setForgotError(null);
                    }}
                    className="w-full py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold text-center transition-colors cursor-pointer"
                  >
                    ← Regresar al inicio de sesión
                  </button>
                </form>
              ) : (
                /* Step 2: Reset Password */
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  {/* Found User Banner */}
                  <div className="p-3.5 rounded-2xl bg-neutral-950 border border-lime-400/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {forgotFoundUser?.name ? forgotFoundUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{forgotFoundUser?.name || 'Usuario'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-400/20 text-lime-300 font-semibold uppercase">
                          {forgotFoundUser?.role === 'owner' ? 'Dueño' : forgotFoundUser?.role === 'trainer' ? 'Entrenador' : 'Alumno'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate">
                        Usuario: <strong className="text-neutral-200">@{forgotFoundUser?.username}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('find');
                        setForgotError(null);
                        setForgotSuccess(null);
                      }}
                      className="text-[11px] text-neutral-400 hover:text-white underline shrink-0 cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>

                  {forgotError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3.5 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 animate-pulse" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-lime-400" />
                        <span>Nueva Contraseña</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {showForgotPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showForgotPass ? 'Ocultar' : 'Mostrar'}</span>
                      </button>
                    </label>
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Mínimo 3 caracteres (fácil de recordar)"
                      id="input-forgot-new-password"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-lime-400" />
                      <span>Confirmar Nueva Contraseña</span>
                    </label>
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Repite tu nueva contraseña exactamente igual"
                      id="input-forgot-confirm-password"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRecovering || !!forgotSuccess}
                    id="btn-submit-reset-password"
                    className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isRecovering ? (
                      <span>Guardando contraseña...</span>
                    ) : forgotSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Acceso Concedido! Ingresando...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Guardar Contraseña e Ingresar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('find');
                      setForgotError(null);
                      setForgotSuccess(null);
                    }}
                    className="w-full py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold text-center transition-colors cursor-pointer"
                  >
                    ← Buscar con otro usuario o teléfono
                  </button>
                </form>
              )}
            </div>
          ) : tab === 'login' ? (
            <div className="space-y-4">
              {/* Quick 1-Click Demo Access */}
              <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Acceso Rápido en 1 Clic
                  </span>
                  <span className="text-[10px] text-neutral-400">Sin teclear contraseña</span>
                </div>

                {currentPortal === 'owner' ? (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setLoginUsername('rony');
                        setLoginPassword('123');
                        setIsSubmitting(true);
                        const res = await loginUser('rony', '123', 'owner');
                        setIsSubmitting(false);
                        if (res.success && res.user) onAuthSuccess(res.user);
                      }}
                      id="btn-quick-login-owner"
                      className="w-full p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left flex items-center justify-between text-xs text-white font-bold transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-xs">
                          R
                        </div>
                        <div>
                          <span className="block leading-tight text-white group-hover:text-amber-300">Rony (Dueño / Administrador)</span>
                          <span className="text-[10px] text-neutral-400">Usuario: rony • Clave: 123</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-extrabold">Entrar en 1 Clic</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-400 p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800/80 leading-relaxed">
                    {currentPortal === 'trainer' ? (
                      <span>
                        Ingresa abajo con tu usuario de entrenador o haz clic en <strong className="text-lime-400">"Crear Cuenta"</strong> si te estás registrando por primera vez.
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
                        ? 'ej: rony'
                        : currentPortal === 'trainer'
                        ? 'ej: marcelo o nico'
                        : 'ej: carlos, matias, jorge o tu usuario'
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
                    placeholder="Tu contraseña secreta (ej: 123)"
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
                    onClick={() => {
                      setForgotIdentifier(loginUsername || '');
                      setForgotStep('find');
                      setForgotFoundUser(null);
                      setForgotError(null);
                      setForgotSuccess(null);
                      setTab('forgot_password');
                    }}
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
