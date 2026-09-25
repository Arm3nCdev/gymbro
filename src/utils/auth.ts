import { AuthUser, GymMember, UserRole } from '../types';
import { generateDefaultWeeklySplit } from '../data/initialData';

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
  bio?: string;
  description?: string;
}

// Zero mock/test users by default: users must register their real accounts
export function getStoredUsers(): StoredCredentials[] {
  try {
    const raw = localStorage.getItem(STORED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading registered users from storage:', err);
  }
  return [];
}

export function saveStoredUsers(users: StoredCredentials[]): void {
  try {
    localStorage.setItem(STORED_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving registered users:', err);
  }
}

export function getCurrentAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.role) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading current auth user:', err);
  }
  return null;
}

export function saveAuthSession(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Error saving auth session:', err);
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.error('Error clearing auth session:', err);
  }
}

// Multi-device Async Login (Server primary, localStorage fallback)
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

  // 1. Try server login first for instant multi-device recognition
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

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        saveAuthSession(data.user);
        // Also save to local credentials cache
        const localUsers = getStoredUsers();
        if (!localUsers.some((u) => u.id === data.user.id)) {
          saveStoredUsers([...localUsers, { ...data.user, password: cleanPassword }]);
        }
        return { success: true, user: data.user };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        return { success: false, error: errData.error };
      }
    }
  } catch (err) {
    console.warn('Server login request failed, falling back to local verification:', err);
  }

  // 2. Offline fallback to local credentials
  const users = getStoredUsers();
  if (users.length === 0) {
    return {
      success: false,
      error: 'Aún no hay usuarios registrados. Haz clic en "Registrarse" para crear tu cuenta.',
    };
  }

  const matched = users.find(
    (u) =>
      (u.username.toLowerCase() === cleanUsername ||
        (u.email && u.email.toLowerCase() === cleanUsername)) &&
      u.password === cleanPassword
  );

  if (!matched) {
    return {
      success: false,
      error: 'Usuario o contraseña incorrectos. Si aún no tienes cuenta, por favor regístrate.',
    };
  }

  if (expectedRole && matched.role !== expectedRole) {
    const roleLabels: Record<UserRole, string> = {
      owner: 'Dueño / Administración',
      trainer: 'Entrenador',
      student: 'Alumno',
    };
    const portalPaths: Record<UserRole, string> = {
      owner: '#/dueno',
      trainer: '#/entrenador',
      student: '#/alumno',
    };
    return {
      success: false,
      error: `Esta cuenta corresponde a "${roleLabels[matched.role]}". Por favor ingresa desde el enlace correspondiente (${portalPaths[matched.role]}).`,
    };
  }

  const authUser: AuthUser = {
    id: matched.id,
    username: matched.username,
    name: matched.name,
    role: matched.role,
    memberId: matched.memberId,
    email: matched.email,
    phone: matched.phone,
    specialty: matched.specialty,
  };

  saveAuthSession(authUser);
  return { success: true, user: authUser };
}

// Multi-device Async Owner Registration
export async function registerOwner(data: {
  name: string;
  username: string;
  password: string;
  email?: string;
  gymName?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanName = data.name.trim();
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanPassword = data.password.trim();

  if (!cleanName) return { success: false, error: 'Ingresa tu nombre y apellido.' };
  if (!cleanUsername) return { success: false, error: 'Ingresa un nombre de usuario.' };
  if (cleanPassword.length < 3) {
    return { success: false, error: 'La contraseña debe tener al menos 3 caracteres.' };
  }

  // 1. Send to server
  try {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role: 'owner',
        email: data.email?.trim() || `${cleanUsername}@gymbro.app`,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.user) {
        saveAuthSession(resData.user);
        const users = getStoredUsers();
        saveStoredUsers([...users, { ...resData.user, password: cleanPassword }]);
        return { success: true, user: resData.user };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Error al registrar el dueño en el servidor.' };
    }
  } catch (err: any) {
    console.warn('Could not register owner on server, falling back locally:', err);
  }

  // 2. Local fallback
  const users = getStoredUsers();
  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'El nombre de usuario ya está en uso. Elige otro.' };
  }

  const userId = `usr_owner_${Date.now()}`;
  const newOwner: StoredCredentials = {
    id: userId,
    username: cleanUsername,
    password: cleanPassword,
    name: cleanName,
    role: 'owner',
    email: data.email?.trim() || `${cleanUsername}@gymbro.app`,
  };

  saveStoredUsers([...users, newOwner]);

  const authUser: AuthUser = {
    id: userId,
    username: cleanUsername,
    name: cleanName,
    role: 'owner',
    email: newOwner.email,
  };

  saveAuthSession(authUser);
  return { success: true, user: authUser };
}

// Multi-device Async Trainer Registration
export async function registerTrainer(data: {
  name: string;
  username: string;
  password: string;
  email?: string;
  specialty?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanName = data.name.trim();
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanPassword = data.password.trim();

  if (!cleanName) return { success: false, error: 'Ingresa tu nombre y apellido.' };
  if (!cleanUsername) return { success: false, error: 'Ingresa un nombre de usuario.' };
  if (cleanPassword.length < 3) {
    return { success: false, error: 'La contraseña debe tener al menos 3 caracteres.' };
  }

  // 1. Send to server
  try {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        username: cleanUsername,
        password: cleanPassword,
        role: 'trainer',
        specialty: data.specialty?.trim() || 'Musculación y Fuerza',
        email: data.email?.trim() || `${cleanUsername}@gymbro.app`,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.user) {
        saveAuthSession(resData.user);
        const users = getStoredUsers();
        saveStoredUsers([...users, { ...resData.user, password: cleanPassword }]);
        return { success: true, user: resData.user };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Error al registrar entrenador en el servidor.' };
    }
  } catch (err: any) {
    console.warn('Could not register trainer on server, falling back locally:', err);
  }

  // 2. Local fallback
  const users = getStoredUsers();
  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'El nombre de usuario ya está en uso.' };
  }

  const userId = `usr_trainer_${Date.now()}`;
  const newTrainer: StoredCredentials = {
    id: userId,
    username: cleanUsername,
    password: cleanPassword,
    name: cleanName,
    role: 'trainer',
    specialty: data.specialty?.trim() || 'Musculación y Fuerza',
    email: data.email?.trim() || `${cleanUsername}@gymbro.app`,
  };

  saveStoredUsers([...users, newTrainer]);

  const authUser: AuthUser = {
    id: userId,
    username: cleanUsername,
    name: cleanName,
    role: 'trainer',
    email: newTrainer.email,
    specialty: newTrainer.specialty,
  };

  saveAuthSession(authUser);
  return { success: true, user: authUser };
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
  if (cleanPassword.length < 3) {
    return { success: false, error: 'La contraseña debe tener al menos 3 caracteres.' };
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

  // 1. Send to server
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
        member: newMember,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.user) {
        saveAuthSession(resData.user);
        const users = getStoredUsers();
        saveStoredUsers([...users, { ...resData.user, password: cleanPassword }]);
        return { success: true, user: resData.user, newMember };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Error al registrar alumno en el servidor.' };
    }
  } catch (err: any) {
    console.warn('Could not register student on server, falling back locally:', err);
  }

  // 2. Local fallback
  const users = getStoredUsers();
  const exists = users.some(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      (data.email && u.email?.toLowerCase() === data.email.trim().toLowerCase())
  );

  if (exists) {
    return { success: false, error: 'El nombre de usuario o correo ya está registrado.' };
  }

  const newCredentials: StoredCredentials = {
    id: userId,
    username: cleanUsername,
    password: cleanPassword,
    name: cleanName,
    role: 'student',
    memberId: memberId,
    email: data.email?.trim() || `${cleanUsername}@gymbro.app`,
    phone: data.phone?.trim(),
  };

  saveStoredUsers([...users, newCredentials]);

  const authUser: AuthUser = {
    id: userId,
    username: cleanUsername,
    name: cleanName,
    role: 'student',
    memberId: memberId,
    email: newCredentials.email,
    phone: newCredentials.phone,
  };

  saveAuthSession(authUser);
  return { success: true, user: authUser, newMember };
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
          saveStoredUsers([...users, { ...result.user, password: data.password }]);
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

