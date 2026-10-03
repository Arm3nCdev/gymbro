import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
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
}

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

  const resetOwnerPassword = async (row: TenantRow) => {
    if (!window.confirm(`¿Generar una contraseña nueva para el dueño de ${row.gymName}? La actual deja de funcionar.`)) return;
    setBusySlug(row.slug);
    try {
      const data = await api(`/tenants/${row.slug}/owner-password`, {});
      setCredentials({ gymName: row.gymName, slug: row.slug, username: data.owner.username, password: data.owner.password });
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
                onResetPassword={() => resetOwnerPassword(row)}
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
            setCredentials({ gymName: payload.name, slug: payload.slug, username: data.owner.username, password: data.owner.password });
            await loadTenants();
          }}
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
  onResetPassword: () => void;
}> = ({ row, busy, onSuspend, onResume, onResetPassword }) => {
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
            onClick={onResetPassword}
            disabled={busy}
            className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-lime-400 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" /> Clave dueño
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/plataforma/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
          <p className="text-xs text-neutral-400">Administración de gimnasios</p>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>}
        <Field label="Usuario" value={username} onChange={setUsername} autoComplete="username" />
        <Field label="Contraseña" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm disabled:opacity-50"
        >
          {submitting ? 'Verificando...' : 'Ingresar'}
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
}> = ({ label, value, onChange, type = 'text', placeholder, autoComplete, hint }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-neutral-300">{label}</span>
    <input
      type={type}
      required
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
  onCreate: (payload: { name: string; slug: string; ownerName: string; ownerUsername: string }) => Promise<void>;
}> = ({ existing, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('admin');
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
      await onCreate({ name: name.trim(), slug: effectiveSlug, ownerName: ownerName.trim(), ownerUsername: ownerUsername.trim() });
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
        <p className="text-[11px] text-neutral-500 flex items-start gap-1.5">
          <Users className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          La contraseña del dueño se genera sola y se muestra una única vez al crear el gimnasio.
        </p>
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
  const message =
    `¡Hola! Ya está listo el sistema de ${credentials.gymName} en GymBro 💪\n\n` +
    `Dueño: ${base}/#/dueno\nUsuario: ${credentials.username}\nContraseña: ${credentials.password}\n\n` +
    `Profesores: ${base}/#/coach (las cuentas las creás desde Enlaces > Crear Usuario)\n` +
    `Alumnos: ${base}/#/alumno (se registran con el QR de Enlaces)`;

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
            <KeyRound className="w-5 h-5 text-lime-400" /> Acceso del dueño
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
