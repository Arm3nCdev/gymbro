import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Dumbbell,
  GraduationCap,
  Copy,
  ExternalLink,
  KeyRound,
  LogOut,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

// Platform panel (/plataforma): the GymBro operator manages the gyms (tenants).
// Its session lives in sessionStorage: it ends when the browser tab closes.

interface TenantRow {
  slug: string;
  name: string;
  gymName: string;
  status: 'active' | 'suspended';
  createdAt: number;
  owner: { username: string; name: string } | null;
  trainers: number;
  students: number;
  members: number;
  membersUpToDate: number;
  lastUpdated: number;
  sizeBytes: number;
  path: string;
}

interface Credentials {
  gymName: string;
  slug: string;
  username: string;
  password: string;
  role?: 'owner' | 'trainer' | 'student';
}

interface GymUser {
  id: string;
  username: string;
  name: string;
  role: 'owner' | 'trainer' | 'student';
  email?: string;
  phone?: string;
}

const ROLE_LABEL: Record<GymUser['role'], string> = { owner: 'Dueño', trainer: 'Profe', student: 'Alumno' };
const ROLE_PORTAL: Record<GymUser['role'], string> = { owner: 'dueno', trainer: 'coach', student: 'alumno' };

const TOKEN_KEY = 'gymbro_platform_token';

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function writeToken(token: string): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // private mode: the session lasts until reload
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 31);
}

function timeAgo(ts: number): string {
  if (!ts) return '—';
  const minutes = Math.round((Date.now() - ts) / 60000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PlatformAdmin: React.FC = () => {
  const [token, setToken] = useState(readToken);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [usersOf, setUsersOf] = useState<TenantRow | null>(null);
  const [showOwnPassword, setShowOwnPassword] = useState(false);

  const api = async (path: string, body?: unknown) => {
    const res = await fetch(`/plataforma/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      writeToken('');
      setToken('');
    }
    if (!res.ok) throw new Error(data.error || 'Error del servidor.');
    return data;
  };

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/tenants');
      setTenants(data.tenants || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const logout = async () => {
    try {
      await api('/logout', {});
    } catch {
      // already expired
    }
    writeToken('');
    setToken('');
  };

  const setStatus = async (row: TenantRow, status: 'active' | 'suspended') => {
    const verb = status === 'suspended' ? 'suspender' : 'reactivar';
    if (!window.confirm(`¿Seguro que querés ${verb} ${row.gymName}?`)) return;
    setBusySlug(row.slug);
    try {
      await api(`/tenants/${row.slug}/status`, { status });
      await loadTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusySlug(null);
    }
  };

  const totals = useMemo(
    () => ({
      gyms: tenants.length,
      active: tenants.filter((t) => t.status === 'active').length,
      students: tenants.reduce((sum, t) => sum + t.students, 0),
      members: tenants.reduce((sum, t) => sum + t.members, 0),
    }),
    [tenants]
  );

  if (!token) {
    return (
      <PlatformLogin
        onLogin={(t) => {
          writeToken(t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-white leading-tight">GymBro · Plataforma</h1>
              <p className="text-[11px] text-neutral-400 truncate">Gimnasios, accesos y suscripciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOwnPassword(true)}
              title="Cambiar mi contraseña"
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-lime-400"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={loadTenants}
              title="Actualizar"
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-lime-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="py-2 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Gimnasios" value={totals.gyms} />
          <Stat label="Activos" value={totals.active} />
          <Stat label="Alumnos con cuenta" value={totals.students} />
          <Stat label="Socios registrados" value={totals.members} />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-white">Gimnasios</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="py-2 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-sm font-extrabold flex items-center gap-1.5 shadow-lg shadow-lime-400/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nuevo gimnasio
          </button>
        </div>

        {tenants.length === 0 && !loading ? (
          <div className="p-8 rounded-2xl border border-dashed border-neutral-800 text-center text-sm text-neutral-400">
            Todavía no hay gimnasios. Creá el primero con <strong className="text-white">Nuevo gimnasio</strong>.
          </div>
        ) : (
          <div className="grid gap-3">
            {tenants.map((row) => (
              <TenantCard
                key={row.slug}
                row={row}
                busy={busySlug === row.slug}
                onSuspend={() => setStatus(row, 'suspended')}
                onResume={() => setStatus(row, 'active')}
                onUsers={() => setUsersOf(row)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateTenantModal
          existing={tenants.map((t) => t.slug)}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            const data = await api('/tenants', payload);
            setShowCreate(false);
            setCredentials({ gymName: payload.name, slug: payload.slug, username: data.owner.username, password: data.owner.password, role: 'owner' });
            await loadTenants();
          }}
        />
      )}

      {usersOf && (
        <UsersModal
          tenant={usersOf}
          api={api}
          onCredentials={setCredentials}
          onClose={() => {
            setUsersOf(null);
            loadTenants();
          }}
        />
      )}

      {showOwnPassword && (
        <OwnPasswordModal
          api={api}
          onDone={(newToken) => {
            writeToken(newToken);
            setToken(newToken);
            setShowOwnPassword(false);
          }}
          onClose={() => setShowOwnPassword(false)}
        />
      )}

      {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
    <div className="text-2xl font-black text-white tabular-nums">{value}</div>
    <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wide mt-0.5">{label}</div>
  </div>
);

const TenantCard: React.FC<{
  row: TenantRow;
  busy: boolean;
  onSuspend: () => void;
  onResume: () => void;
  onUsers: () => void;
}> = ({ row, busy, onSuspend, onResume, onUsers }) => {
  const suspended = row.status === 'suspended';
  const url = `${window.location.origin}${row.path}`;
  return (
    <div className={`p-4 rounded-2xl border bg-neutral-900 ${suspended ? 'border-rose-500/30' : 'border-neutral-800'}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${suspended ? 'bg-rose-500/10 text-rose-400' : 'bg-lime-400/10 text-lime-400'}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white truncate">{row.gymName}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  suspended ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-lime-400/10 text-lime-400 border-lime-400/25'
                }`}
              >
                {suspended ? 'Suspendido' : 'Activo'}
              </span>
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="text-xs font-mono text-neutral-400 hover:text-lime-400 break-all">
              {window.location.host}
              {row.path}
            </a>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Dueño: <span className="text-neutral-300">{row.owner ? `${row.owner.name} (@${row.owner.username})` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-[11px] lg:w-80 shrink-0">
          <MiniStat label="Alumnos" value={row.students} />
          <MiniStat label="Profes" value={row.trainers} />
          <MiniStat label="Al día" value={`${row.membersUpToDate}/${row.members}`} />
          <MiniStat label="Actividad" value={timeAgo(row.lastUpdated)} small />
        </div>

        <div className="flex items-center gap-2 flex-wrap lg:justify-end">
          <a
            href={`${url}#/dueno`}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir
          </a>
          <button
            onClick={onUsers}
            disabled={busy}
            className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-lime-400 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Users className="w-3.5 h-3.5" /> Usuarios
          </button>
          {suspended ? (
            <button
              onClick={onResume}
              disabled={busy}
              className="py-2 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" /> Reactivar
            </button>
          ) : (
            <button
              onClick={onSuspend}
              disabled={busy}
              className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5" /> Suspender
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-neutral-800/70 text-[11px] text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>Alta: {new Date(row.createdAt).toLocaleDateString('es-PY')}</span>
        <span>Base de datos: {formatSize(row.sizeBytes)}</span>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: React.ReactNode; small?: boolean }> = ({ label, value, small }) => (
  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
    <div className={`font-extrabold text-white tabular-nums truncate ${small ? 'text-[11px]' : 'text-sm'}`}>{value}</div>
    <div className="text-neutral-500 truncate">{label}</div>
  </div>
);

const PlatformLogin: React.FC<{ onLogin: (token: string) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ needsSetup: boolean; codeRequired: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/plataforma/api/setup')
      .then((res) => res.json())
      .then(setSetup)
      .catch(() => setSetup({ needsSetup: false, codeRequired: false }));
  }, []);

  const isSetup = !!setup?.needsSetup;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isSetup && password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(isSetup ? '/plataforma/api/setup' : '/plataforma/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSetup ? { username, password, code } : { username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) onLogin(data.token);
      else setError(data.error || 'No se pudo ingresar.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-lime-400 text-neutral-950 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-extrabold text-white">GymBro · Plataforma</h1>
          <p className="text-xs text-neutral-400">
            {isSetup ? 'Primera vez: creá tu usuario administrador' : 'Administración de gimnasios'}
          </p>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>}
        {isSetup && setup?.codeRequired && (
          <Field label="Código de instalación" value={code} onChange={setCode} hint="Lo recibiste junto con el servidor. Se usa una sola vez." />
        )}
        <Field label="Usuario" value={username} onChange={setUsername} autoComplete="username" />
        <Field
          label="Contraseña"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={isSetup ? 'new-password' : 'current-password'}
          hint={isSetup ? 'Mínimo 8 caracteres.' : undefined}
        />
        {isSetup && <Field label="Repetir contraseña" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />}
        <button
          type="submit"
          disabled={submitting || !setup}
          className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm disabled:opacity-50"
        >
          {submitting ? 'Verificando...' : isSetup ? 'Crear administrador e ingresar' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, autoComplete, hint, required = true }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-neutral-300">{label}</span>
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400"
    />
    {hint && <span className="block text-[11px] text-neutral-500">{hint}</span>}
  </label>
);

const CreateTenantModal: React.FC<{
  existing: string[];
  onClose: () => void;
  onCreate: (payload: { name: string; slug: string; ownerName: string; ownerUsername: string; ownerPassword: string }) => Promise<void>;
}> = ({ existing, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('admin');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const taken = existing.includes(effectiveSlug);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (taken) {
      setError('Ese identificador ya está en uso.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        slug: effectiveSlug,
        ownerName: ownerName.trim(),
        ownerUsername: ownerUsername.trim(),
        ownerPassword: ownerPassword.trim(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-lime-400" /> Nuevo gimnasio
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>}
        <Field label="Nombre del gimnasio" value={name} onChange={setName} placeholder="Ej: FitZone Gym" />
        <Field
          label="Identificador (va en el enlace)"
          value={effectiveSlug}
          onChange={(v) => {
            setSlugTouched(true);
            setSlug(slugify(v));
          }}
          placeholder="fitzone"
          hint={`${window.location.host}/${effectiveSlug || 'identificador'}/${taken ? '  — ya existe' : ''}`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre del dueño" value={ownerName} onChange={setOwnerName} placeholder="Ej: Juan Pérez" />
          <Field label="Usuario del dueño" value={ownerUsername} onChange={setOwnerUsername} placeholder="admin" />
        </div>
        <Field
          label="Contraseña del dueño (opcional)"
          value={ownerPassword}
          onChange={setOwnerPassword}
          required={false}
          autoComplete="new-password"
          placeholder="Vacío = se genera una segura"
          hint="Mínimo 6 caracteres. Se muestra una única vez al crear el gimnasio."
        />
        <button
          type="submit"
          disabled={submitting || !effectiveSlug}
          className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm disabled:opacity-50"
        >
          {submitting ? 'Creando...' : 'Crear gimnasio'}
        </button>
      </form>
    </div>
  );
};

const CredentialsModal: React.FC<{ credentials: Credentials; onClose: () => void }> = ({ credentials, onClose }) => {
  const [copied, setCopied] = useState(false);
  const base = `${window.location.origin}/${credentials.slug}`;
  const role = credentials.role || 'owner';
  const message =
    role === 'owner'
      ? `¡Hola! Ya está listo el sistema de ${credentials.gymName} en GymBro 💪\n\n` +
        `Dueño: ${base}/#/dueno\nUsuario: ${credentials.username}\nContraseña: ${credentials.password}\n\n` +
        `Profesores: ${base}/#/coach (las cuentas las creás desde Enlaces > Crear Usuario)\n` +
        `Alumnos: ${base}/#/alumno (se registran con el QR de Enlaces)`
      : `¡Hola! Tu acceso de ${ROLE_LABEL[role].toLowerCase()} en ${credentials.gymName} 💪\n\n` +
        `${base}/#/${ROLE_PORTAL[role]}\nUsuario: ${credentials.username}\nContraseña: ${credentials.password}`;

  const copy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-lime-400" /> Acceso de {ROLE_LABEL[credentials.role || 'owner'].toLowerCase()}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/25 rounded-xl p-3">
          Guardá o enviá estos datos ahora: la contraseña no se vuelve a mostrar. Si se pierde, generá una nueva.
        </p>
        <pre className="whitespace-pre-wrap break-words text-xs bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 font-mono">
          {message}
        </pre>
        <button
          onClick={copy}
          className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? '¡Copiado!' : 'Copiar mensaje para enviar'}
        </button>
      </div>
    </div>
  );
};

const UsersModal: React.FC<{
  tenant: TenantRow;
  api: (path: string, body?: unknown) => Promise<any>;
  onCredentials: (c: Credentials) => void;
  onClose: () => void;
}> = ({ tenant, api, onCredentials, onClose }) => {
  const [users, setUsers] = useState<GymUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<GymUser['role']>('trainer');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const data = await api(`/tenants/${tenant.slug}/users`);
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api(`/tenants/${tenant.slug}/users`, { role, name: name.trim(), username: username.trim(), password });
      onCredentials({ gymName: tenant.gymName, slug: tenant.slug, username: data.user.username, password, role });
      setName('');
      setUsername('');
      setPassword('');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (user: GymUser) => {
    const given = window.prompt(
      `Contraseña nueva para ${user.name} (@${user.username}).\nDejala vacía para generar una segura.`,
      ''
    );
    if (given === null) return;
    setError(null);
    try {
      const data = await api(`/tenants/${tenant.slug}/users/${encodeURIComponent(user.id)}/password`, { password: given });
      onCredentials({ gymName: tenant.gymName, slug: tenant.slug, username: data.username, password: data.password, role: user.role });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const groups: GymUser['role'][] = ['owner', 'trainer', 'student'];
  const icon = (r: GymUser['role']) =>
    r === 'owner' ? <ShieldCheck className="w-4 h-4" /> : r === 'trainer' ? <Dumbbell className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2 min-w-0">
            <Users className="w-5 h-5 text-lime-400 shrink-0" />
            <span className="truncate">Usuarios · {tenant.gymName}</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>}

        <form onSubmit={create} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="text-xs font-extrabold text-white uppercase tracking-wide">Nuevo usuario</div>
          <div className="grid grid-cols-3 gap-2">
            {groups.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  role === r ? 'bg-lime-400 text-neutral-950 border-lime-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {icon(r)} {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Nombre" value={name} onChange={setName} placeholder="Ej: Ana López" />
            <Field label="Usuario" value={username} onChange={(v) => setUsername(v.toLowerCase())} placeholder="ana.lopez" />
            <Field label="Contraseña" value={password} onChange={setPassword} placeholder="Mínimo 6" autoComplete="new-password" />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> {submitting ? 'Creando...' : `Crear ${ROLE_LABEL[role].toLowerCase()}`}
          </button>
        </form>

        {groups.map((r) => {
          const list = users.filter((u) => u.role === r);
          return (
            <div key={r} className="space-y-2">
              <div className="text-xs font-extrabold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5">
                {icon(r)} {ROLE_LABEL[r]}s ({list.length})
              </div>
              {list.length === 0 ? (
                <div className="text-xs text-neutral-500 px-1">Ninguno todavía.</div>
              ) : (
                list.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{u.name}</div>
                      <div className="text-[11px] text-neutral-500 truncate">@{u.username}</div>
                    </div>
                    <button
                      onClick={() => resetPassword(u)}
                      className="py-1.5 px-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-lime-400 text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Contraseña
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OwnPasswordModal: React.FC<{
  api: (path: string, body?: unknown) => Promise<any>;
  onDone: (token: string) => void;
  onClose: () => void;
}> = ({ api, onDone, onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    try {
      const data = await api('/password', { current, password: next });
      onDone(data.token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-lime-400" /> Mi contraseña
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>}
        <Field label="Contraseña actual" value={current} onChange={setCurrent} type="password" autoComplete="current-password" />
        <Field label="Contraseña nueva" value={next} onChange={setNext} type="password" autoComplete="new-password" hint="Mínimo 8 caracteres." />
        <Field label="Repetir contraseña nueva" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
        <button type="submit" className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm">
          Guardar
        </button>
      </form>
    </div>
  );
};
