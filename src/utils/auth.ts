import { AuthUser, GymMember, UserRole } from '../types';
import { generateDefaultWeeklySplit, INITIAL_SEED_USERS } from '../data/initialData';

const AUTH_SESSION_KEY = 'gymbro_current_auth_user_v2';
const STORED_USERS_KEY = 'gymbro_registered_users_v2';

export interface StoredCredentials {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  memberId?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  avatar?: string;
  birthDate?: string;
  bio?: string;
  description?: string;
}

function isDeprecatedTestUser(user: any): boolean {
  if (!user) return false;
  const id = String(user.id || '');
  const username = String(user.username || '').toLowerCase();
  // Old demo owner cached by earlier versions (rony / 123)
  if (id === 'usr_owner_rony' && user.password === '123') return true;
  const testIds = [
    'usr_client_1', 'usr_trainer_1', 'usr_owner_1',
    'usr_trainer_marcelo', 'usr_trainer_nico',
    'usr_std_carlos', 'usr_std_lucas', 'usr_std_camila',
    'usr_std_matias', 'usr_std_enzo', 'usr_std_sofia',
    'usr_std_franco', 'usr_std_valeria', 'usr_std_jorge', 'usr_std_rodrigo'
  ];
  const testUsernames = ['marcelo', 'nico', 'carlos', 'lucas', 'camila', 'matias', 'enzo', 'sofia', 'franco', 'valeria', 'jorge', 'rodrigo'];
  return testIds.includes(id) || testUsernames.includes(username);
}

// Initial stored users (the owner account is provisioned by the server)
export function getStoredUsers(): StoredCredentials[] {
  try {
    const raw = localStorage.getItem(STORED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Clean out deprecated test mock users and any password cached by older versions
        const hadPasswords = parsed.some((u) => u && 'password' in u);
        const cleaned = parsed
          .filter((u) => !isDeprecatedTestUser(u))
          .map(({ password: _password, ...rest }: StoredCredentials) => rest as StoredCredentials);
        // Ensure initial seed users are present
        let changed = false;
        for (const seed of INITIAL_SEED_USERS) {
          if (!cleaned.some((u) => u.username?.toLowerCase() === seed.username.toLowerCase())) {
            cleaned.push(seed as StoredCredentials);
            changed = true;
          }
        }
        if (changed || hadPasswords || cleaned.length !== parsed.length) {
          saveStoredUsers(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error reading registered users from storage:', err);
  }
  return INITIAL_SEED_USERS as StoredCredentials[];
}

// Only the public profile is cached in the browser: passwords never leave the server.
export function saveStoredUsers(users: StoredCredentials[]): void {
  try {
    const withoutPasswords = users.map(({ password: _password, ...rest }) => rest);
    localStorage.setItem(STORED_USERS_KEY, JSON.stringify(withoutPasswords));
  } catch (err) {
    console.error('Error saving registered users:', err);
  }
}

export const getSessionKeyForPortal = (portal?: string) => {
  if (portal === 'student' || portal === 'alumno') return 'gymbro_session_student_v3';
  if (portal === 'trainer' || portal === 'coach' || portal === 'entrenador') return 'gymbro_session_trainer_v3';
  if (portal === 'owner' || portal === 'dueno' || portal === 'dueño' || portal === 'admin') return 'gymbro_session_owner_v3';
  return 'gymbro_current_auth_user_v2';
};

export function getCurrentAuthUser(portal?: string): AuthUser | null {
  try {
    if (portal) {
      const portalKey = getSessionKeyForPortal(portal);
      const portalRaw = localStorage.getItem(portalKey);
      if (portalRaw) {
        const parsed = JSON.parse(portalRaw);
        if (parsed && isDeprecatedTestUser(parsed)) {
          localStorage.removeItem(portalKey);
          return null;
        }
        if (parsed && parsed.id && parsed.role) {
          const roleMatches =
            (portal === 'student' && parsed.role === 'student') ||
            (portal === 'trainer' && parsed.role === 'trainer') ||
            (portal === 'owner' && parsed.role === 'owner');
          if (roleMatches) {
            return parsed;
          }
        }
      }
      // Strictly return null if requesting a specific portal and no matching session exists
      return null;
    }

    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && isDeprecatedTestUser(parsed)) {
        localStorage.removeItem(AUTH_SESSION_KEY);
        return null;
      }
      if (parsed && parsed.id && parsed.role) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading current auth user:', err);
  }
  return null;
}

// Robust validation of authentication state for any URL or specific portal
export function validateAuthSession(portal?: string): {
  isValid: boolean;
  user: AuthUser | null;
  error?: string;
} {
  const user = getCurrentAuthUser(portal);
  if (!user) {
    return { isValid: false, user: null, error: 'Sesión no iniciada' };
  }

  // Sessions from older versions (or offline logins) have no server token and can't sync.
  if (!user.token) {
    clearAuthSession(portal);
    return { isValid: false, user: null, error: 'Sesión expirada' };
  }

  // Strictly enforce role matching
  if (portal) {
    const roleMatches =
      (portal === 'student' && user.role === 'student') ||
      (portal === 'trainer' && user.role === 'trainer') ||
      (portal === 'owner' && user.role === 'owner');
    if (!roleMatches) {
      clearAuthSession(portal);
      return { isValid: false, user: null, error: 'Rol no autorizado para este portal' };
    }
  }

  // Ensure user exists in registered users or initial seeds
  const stored = getStoredUsers();
  const exists = stored.some(
    (u) =>
      u.id === user.id ||
      (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
  );

  if (!exists) {
    clearAuthSession(portal);
    return { isValid: false, user: null, error: 'Cuenta no encontrada o expirada' };
  }

  return { isValid: true, user };
}

// Reads the active portal from the URL hash, path or query params with full alias support
export function getPortalFromLocation(): 'student' | 'trainer' | 'owner' {
  if (typeof window === 'undefined') return 'student';
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  const pathname = (window.location.pathname || '').toLowerCase();

  let paramPortal = '';
  try {
    const params = new URLSearchParams(window.location.search);
    paramPortal = (params.get('portal') || params.get('role') || params.get('p') || params.get('view') || '').toLowerCase();
  } catch {
    // ignore
  }

  const combined = `${pathname} ${hash} ${search} ${paramPortal}`;

  if (
    combined.includes('dueno') ||
    combined.includes('dueño') ||
    combined.includes('owner') ||
    combined.includes('admin') ||
    combined.includes('administracion') ||
    combined.includes('gerencia')
  ) {
    return 'owner';
  }

  if (
    combined.includes('coach') ||
    combined.includes('entrenador') ||
    combined.includes('trainer') ||
    combined.includes('profe') ||
    combined.includes('profesor')
  ) {
    return 'trainer';
  }

  return 'student';
}

// Adds the active portal's session token to every /api request and logs the portal out
// when the server reports the session as expired (401).
export function installApiAuth(): void {
  if (typeof window === 'undefined' || (window as any).__gymbroApiAuth) return;
  (window as any).__gymbroApiAuth = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
    if (!isApi) return originalFetch(input, init);

    const portal = getPortalFromLocation();
    const token = getCurrentAuthUser(portal)?.token;
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await originalFetch(input, { ...init, headers });
    if (res.status === 401 && token) {
      clearAuthSession(portal);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    return res;
  };
}

export function saveAuthSession(user: AuthUser, portal?: string): void {
  try {
    const targetPortal = portal || user.role;
    const portalKey = getSessionKeyForPortal(targetPortal);
    // Profile updates return the user without its token: keep the current one.
    if (!user.token) {
      const previous = getCurrentAuthUser(targetPortal);
      if (previous && previous.id === user.id && previous.token) {
        user = { ...user, token: previous.token };
      }
    }
    localStorage.setItem(portalKey, JSON.stringify(user));
    // Also save to generic key only if generic key is empty or has same role
    const existing = localStorage.getItem(AUTH_SESSION_KEY);
    if (!existing) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.role === user.role) {
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
        }
      } catch {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      }
    }
  } catch (err) {
    console.error('Error saving auth session:', err);
  }
}

export function clearAuthSession(portal?: string): void {
  try {
    if (portal) {
      localStorage.removeItem(getSessionKeyForPortal(portal));
      const existing = localStorage.getItem(AUTH_SESSION_KEY);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed.role === portal) {
            localStorage.removeItem(AUTH_SESSION_KEY);
          }
        } catch {
          localStorage.removeItem(AUTH_SESSION_KEY);
        }
      }
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem('gymbro_session_student_v3');
      localStorage.removeItem('gymbro_session_trainer_v3');
      localStorage.removeItem('gymbro_session_owner_v3');
    }
  } catch (err) {
    console.error('Error clearing auth session:', err);
  }
}

// Login is always validated by the server (it issues the session token every portal needs).
export async function loginUser(
  usernameInput: string,
  passwordInput: string,
  expectedRole?: UserRole
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername) {
    return { success: false, error: 'Ingresa tu usuario o correo electrónico.' };
  }
  if (!cleanPassword) {
    return { success: false, error: 'Ingresa tu contraseña.' };
  }

  try {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        password: cleanPassword,
        expectedRole,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.user) {
      saveAuthSession(data.user, expectedRole || data.user.role);
      const localUsers = getStoredUsers();
      if (!localUsers.some((u) => u.id === data.user.id)) {
        saveStoredUsers([...localUsers, data.user]);
      }
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Usuario o contraseña incorrectos.' };
  } catch (err) {
    console.warn('Server login request failed:', err);
    return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.' };
  }
}

// Tells the server to revoke this portal's session token, then forgets it locally.
export async function logoutUser(portal?: string): Promise<void> {
  if (getCurrentAuthUser(portal)?.token) {
    try {
      await fetch('/api/users/logout', { method: 'POST' });
    } catch {
      // Offline: the token still expires on its own.
    }
  }
  clearAuthSession(portal);
}

// Multi-device Async Student Registration
export async function registerStudent(data: {
  name: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  goal?: string;
  planName?: string;
  planPrice?: number;
  paymentMethod?: 'efectivo' | 'transferencia';
}): Promise<{ success: boolean; user?: AuthUser; newMember?: GymMember; error?: string }> {
  const cleanName = data.name.trim();
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanPassword = data.password.trim();

  if (!cleanName) {
    return { success: false, error: 'Por favor ingresa tu nombre y apellido.' };
  }
  if (!cleanUsername) {
    return { success: false, error: 'Por favor ingresa un nombre de usuario.' };
  }
  if (cleanPassword.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const memberId = `mem_${Date.now()}`;
  const userId = `usr_student_${Date.now()}`;

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 30);

  // Initial Member Object
  const newMember: GymMember = {
    id: memberId,
    name: cleanName,
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
    email: data.email?.trim() || `${cleanUsername}@gymbro.app`,
    phone: data.phone?.trim() || '+595 981 000-000',
    memberSince: 'Hoy',
    planName: data.planName || 'Pase Libre Musculación',
    planPrice: data.planPrice || 180000,
    paymentMethod: data.paymentMethod || 'transferencia',
    paymentStatus: 'pendiente', // Locked routine until payment confirmed
    nextDueDate: nextDueDate.toISOString().split('T')[0],
    daysAbsent: 0,
    streakDays: 1,
    lastAttended: 'Hoy',
    goal: data.goal || 'Fuerza, salud y acondicionamiento físico',
    injuriesNotes: 'Sin lesiones reportadas.',
    todayMood: 'energia',
    todayWorkoutCompleted: false,
    paymentsHistory: [],
    routines: generateDefaultWeeklySplit(memberId),
    weightHistory: [
      {
        id: `w_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        weightKg: 72,
        note: 'Peso inicial de registro',
      },
    ],
    photos: [],
    messages: [
      {
        id: `msg_welcome_${Date.now()}`,
        type: 'support_motivational',
        title: '¡Bienvenido a GymBro! 💪🔥',
        content: `¡Hola ${cleanName}! Te damos la bienvenida a tu portal de entrenamiento. Una vez confirmada tu cuota mensual en recepción o por transferencia, tu rutina diaria quedará 100% liberada para que entrenes cada día. ¡A meterle con todo!`,
        date: 'Hoy',
        sender: 'Coach GymBro',
        read: false,
      },
    ],
  };

  try {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role: 'student',
        email: newMember.email,
        phone: newMember.phone,
        member: { goal: newMember.goal, paymentMethod: newMember.paymentMethod },
      }),
    });
    const resData = await res.json().catch(() => ({}));
    if (res.ok && resData.success && resData.user) {
      saveAuthSession(resData.user);
      saveStoredUsers([...getStoredUsers(), resData.user]);
      const serverMember = Array.isArray(resData.members)
        ? resData.members.find((m: GymMember) => m.id === resData.user.memberId)
        : undefined;
      return { success: true, user: resData.user, newMember: serverMember };
    }
    return { success: false, error: resData.error || 'Error al registrar alumno en el servidor.' };
  } catch (err: any) {
    console.warn('Could not register student on server:', err);
    return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.' };
  }
}

// Direct User Creation by Gym Owner (assign trainers or students directly)
export async function directCreateUserByOwner(data: {
  name: string;
  username: string;
  password: string;
  role: 'trainer' | 'student';
  email?: string;
  phone?: string;
  specialty?: string;
  planPrice?: number;
}): Promise<{ success: boolean; user?: any; member?: GymMember; error?: string }> {
  try {
    const res = await fetch('/api/users/direct-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.user) {
        const users = getStoredUsers();
        if (!users.some((u) => u.username.toLowerCase() === result.user.username.toLowerCase())) {
          saveStoredUsers([...users, result.user]);
        }
      }
      return { success: true, user: result.user, member: result.member };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Error al crear el usuario directamente.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con el servidor.' };
  }
}

// Update User Profile (Dueño, Coach, Alumno)
export async function updateUserProfile(data: {
  userId: string;
  name?: string;
  avatar?: string;
  birthDate?: string;
  bio?: string;
  description?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  goal?: string;
}): Promise<{ success: boolean; user?: AuthUser; member?: GymMember; error?: string }> {
  try {
    // 1. Try server sync
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.user) {
          // Update local session
          const current = getCurrentAuthUser();
          if (current && current.id === data.userId) {
            saveAuthSession({ ...current, ...result.user });
          }
          // Update cached stored users
          const users = getStoredUsers();
          const updatedUsers = users.map((u) => (u.id === data.userId ? { ...u, ...result.user } : u));
          saveStoredUsers(updatedUsers);
          return { success: true, user: result.user, member: result.member };
        }
      }
    } catch (e) {
      console.warn('Server profile update error, updating local:', e);
    }

    // 2. Local fallback update
    const users = getStoredUsers();
    const existingIndex = users.findIndex((u) => u.id === data.userId);
    if (existingIndex >= 0) {
      const updatedUserRecord: StoredCredentials = {
        ...users[existingIndex],
        ...(data.name ? { name: data.name } : {}),
        ...(data.avatar ? { avatar: data.avatar } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
      };
      users[existingIndex] = updatedUserRecord;
      saveStoredUsers(users);

      const authUser: AuthUser = {
        id: updatedUserRecord.id,
        username: updatedUserRecord.username,
        name: updatedUserRecord.name,
        role: updatedUserRecord.role,
        memberId: updatedUserRecord.memberId,
        email: updatedUserRecord.email,
        phone: updatedUserRecord.phone,
        specialty: updatedUserRecord.specialty,
        avatar: updatedUserRecord.avatar,
        birthDate: updatedUserRecord.birthDate,
        bio: updatedUserRecord.bio,
        description: updatedUserRecord.description,
      };

      const current = getCurrentAuthUser();
      if (current && current.id === data.userId) {
        saveAuthSession(authUser);
      }

      return { success: true, user: authUser };
    }

    return { success: false, error: 'Usuario no encontrado para actualizar.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al actualizar perfil' };
  }
}

// Password reset is done by the gym owner for a trainer or student (no self-service recovery).
export async function resetPasswordByOwner(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword: newPassword.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, message: data.message };
    return { success: false, error: data.error || 'No se pudo restablecer la contraseña.' };
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.' };
  }
}

export async function getRegisteredTrainers(): Promise<{ id: string; name: string; username?: string; specialty?: string }[]> {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        const trainers = data.users.filter((u: any) => u.role === 'trainer');
        if (trainers.length > 0) {
          return trainers.map((t: any) => ({
            id: t.id,
            name: t.name,
            username: t.username,
            specialty: t.specialty || 'Entrenador Personal',
          }));
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch server trainers, using local store:', err);
  }

  const localUsers = getStoredUsers();
  const localTrainers = localUsers.filter((u) => u.role === 'trainer');
  if (localTrainers.length > 0) {
    return localTrainers.map((t) => ({
      id: t.id,
      name: t.name,
      username: t.username,
      specialty: t.specialty || 'Entrenador Personal',
    }));
  }

  return [];
}


