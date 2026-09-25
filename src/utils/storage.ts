import { GymMember, GymSettings } from '../types';
import { INITIAL_MEMBERS } from '../data/initialData';

const STORAGE_KEY = 'gymbro_app_data_v1';
const SETTINGS_KEY = 'gymbro_app_settings_v1';
const SYNC_TIMESTAMP_KEY = 'gymbro_last_sync_timestamp';

export const DEFAULT_SETTINGS: GymSettings = {
  gymName: 'GymBro Fitness Center',
  tagline: 'Fuerza, Salud y Rendimiento',
  phone: '+595 981 123456',
  address: 'Av. Mariscal López 1250, Asunción, Paraguay',
  currencySymbol: '₲',
  monthlyDefaultPrice: 180000,
  ownerName: 'Prof. Lucas Morales',
  supportEmail: 'administracion@gymbro.app',
};

export function loadGymSettings(): GymSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-migrate to Guaraní if old default was ARS or $
      if (parsed.currencySymbol === '$' || !parsed.currencySymbol) {
        parsed.currencySymbol = '₲';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Error loading settings from localStorage:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveGymSettings(settings: GymSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to localStorage:', err);
  }
}

export function sanitizeMember(raw: any, index: number = 0): GymMember {
  const fallback = (INITIAL_MEMBERS && INITIAL_MEMBERS.length > 0)
    ? (INITIAL_MEMBERS[index % INITIAL_MEMBERS.length] || INITIAL_MEMBERS[0])
    : ({} as GymMember);

  if (!raw || typeof raw !== 'object') return fallback;

  return {
    id: String(raw.id || `mem_${Date.now()}_${index}`),
    name: String(raw.name || fallback.name || 'Socio GymBro'),
    avatar: String(raw.avatar || fallback.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'),
    email: String(raw.email || fallback.email || 'socio@email.com'),
    phone: String(raw.phone || fallback.phone || '+595 981 000-000'),
    memberSince: String(raw.memberSince || fallback.memberSince || 'Reciente'),
    planName: String(raw.planName || fallback.planName || 'Pase Libre'),
    planPrice: typeof raw.planPrice === 'number' ? raw.planPrice : (fallback.planPrice || 180000),
    paymentMethod: raw.paymentMethod === 'efectivo' ? 'efectivo' : 'transferencia',
    paymentStatus: raw.paymentStatus === 'pendiente' ? 'pendiente' : 'al_dia',
    nextDueDate: String(raw.nextDueDate || fallback.nextDueDate || new Date().toISOString().split('T')[0]),
    daysAbsent: typeof raw.daysAbsent === 'number' ? raw.daysAbsent : (fallback.daysAbsent || 0),
    streakDays: typeof raw.streakDays === 'number' ? raw.streakDays : (fallback.streakDays || 1),
    lastAttended: String(raw.lastAttended || fallback.lastAttended || 'Hoy'),
    goal: String(raw.goal || fallback.goal || 'Acondicionamiento y Fuerza'),
    injuriesNotes: String(raw.injuriesNotes || fallback.injuriesNotes || 'Sin lesiones reportadas.'),
    todayMood: raw.todayMood || fallback.todayMood || 'energia',
    todayWorkoutCompleted: Boolean(raw.todayWorkoutCompleted),
    paymentsHistory: Array.isArray(raw.paymentsHistory) ? raw.paymentsHistory : (fallback.paymentsHistory || []),
    routines: Array.isArray(raw.routines) ? raw.routines : (fallback.routines || []),
    weightHistory: Array.isArray(raw.weightHistory) ? raw.weightHistory : (fallback.weightHistory || []),
    photos: Array.isArray(raw.photos) ? raw.photos : (fallback.photos || []),
    messages: Array.isArray(raw.messages) ? raw.messages : (fallback.messages || []),
  };
}

export function exportGymDataBackup(members: GymMember[], settings: GymSettings): void {
  const exportPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    system: 'GymBro Pro',
    settings,
    totalMembers: members.length,
    members,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanGymName = settings.gymName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `gymbro_backup_${cleanGymName}_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importGymDataBackup(
  jsonText: string
): { success: boolean; members?: GymMember[]; settings?: GymSettings; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed) {
      return { success: false, error: 'El archivo está vacío o dañado.' };
    }

    const rawMembers: any[] = Array.isArray(parsed.members)
      ? parsed.members
      : Array.isArray(parsed)
      ? parsed
      : [];

    if (rawMembers.length === 0) {
      return { success: false, error: 'No se encontraron socios válidos en el archivo de respaldo.' };
    }

    const members: GymMember[] = rawMembers.map((m, idx) => sanitizeMember(m, idx));

    const settings: GymSettings = parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS;

    return { success: true, members, settings };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al procesar el archivo JSON.' };
  }
}

export function loadGymMembers(): GymMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any, idx: number) => sanitizeMember(m, idx));
      }
    }
  } catch (err) {
    console.error('Error loading members from localStorage:', err);
  }
  return [];
}

export const loadFromStorage = (fallback?: GymMember[]) => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any, idx: number) => sanitizeMember(m, idx));
      }
    }
  } catch (err) {
    console.error('Error loading members from localStorage:', err);
  }
  return fallback || [];
};

export function saveGymMembers(members: GymMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch (err) {
    console.error('Error saving members to localStorage:', err);
  }
}

export const saveToStorage = saveGymMembers;

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₲ 0';
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `₲ ${formatted}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  if (dateString.includes('Hoy') || dateString.includes('Ayer') || dateString.includes('Hace')) {
    return dateString;
  }
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateString;
}

/**
 * Normalizes phone numbers with full flexibility for Paraguayan (PY +595)
 * and Argentine (AR +54) lines, as well as generic international numbers.
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  
  // Strip non-digits except initial plus
  let digits = phone.trim().replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  // Check if it already has Paraguay country code (595)
  if (digits.startsWith('595')) {
    // If entered as 5950981..., remove redundant leading 0 from mobile prefix
    if (digits.startsWith('5950')) {
      digits = '595' + digits.slice(4);
    }
    return digits;
  }

  // Check if it already has Argentina country code (54)
  if (digits.startsWith('54')) {
    // Argentina mobile WhatsApp requires 9 after country code (549...)
    if (!digits.startsWith('549')) {
      digits = '549' + digits.slice(2);
    }
    // Remove extra 0 or 15 if present after 549
    if (digits.startsWith('5490')) {
      digits = '549' + digits.slice(4);
    }
    return digits;
  }

  // Paraguayan local format: starts with 09xx (e.g. 0981 123456 -> 595981123456)
  if (digits.startsWith('09') && (digits.length === 10 || digits.length === 9 || digits.length === 11)) {
    return '595' + digits.slice(1);
  }

  // Paraguayan local without 0: starts with 9xx (e.g. 981 123456 -> 595981123456)
  if (digits.startsWith('9') && digits.length === 9) {
    return '595' + digits;
  }

  // Argentine local format: starts with 011 or 0 (e.g. 011 4400 9988 -> 5491144009988)
  if (digits.startsWith('011')) {
    return '54911' + digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return '549' + digits.slice(1);
  }
  if (digits.startsWith('11') && digits.length === 10) {
    return '54911' + digits.slice(2);
  }

  // Fallback: return raw numeric digits
  return digits;
}

export function createWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// ---------------------------------------------------------------------------
// Cloud Sync Helpers: Real-time Multi-device Sync (PC <-> Celular)
// ---------------------------------------------------------------------------

export async function fetchServerGymData(): Promise<{
  members: GymMember[];
  users: any[];
  settings: GymSettings;
  lastUpdated: number;
} | null> {
  try {
    const res = await fetch('/api/gym-data', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Array.isArray(data.members)) {
      const sanitizedMembers = data.members.map((m: any, idx: number) => sanitizeMember(m, idx));
      const sanitizedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      return {
        members: sanitizedMembers,
        users: Array.isArray(data.users) ? data.users : [],
        settings: sanitizedSettings,
        lastUpdated: data.lastUpdated || Date.now(),
      };
    }
  } catch (err) {
    console.warn('Could not fetch gym data from server, using local data:', err);
  }
  return null;
}

export async function pushServerGymData(
  members: GymMember[],
  settings?: GymSettings,
  users?: any[]
): Promise<boolean> {
  try {
    const res = await fetch('/api/gym-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        members,
        settings,
        users,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.lastUpdated) {
        localStorage.setItem(SYNC_TIMESTAMP_KEY, String(data.lastUpdated));
      }
      return true;
    }
  } catch (err) {
    console.warn('Could not push gym data to server:', err);
  }
  return false;
}

export async function serverNotifyPayment(
  memberId: string,
  method: 'efectivo' | 'transferencia',
  note?: string
): Promise<GymMember | null> {
  try {
    const res = await fetch(`/api/members/${memberId}/notify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, note }),
    });
    if (res.ok) {
      const data = await res.json();
      return sanitizeMember(data.member);
    }
  } catch (err) {
    console.warn('Could not notify payment on server:', err);
  }
  return null;
}

export async function serverApprovePayment(
  memberId: string,
  paymentDetails: { amount?: number; method?: string; receiptNote?: string }
): Promise<GymMember | null> {
  try {
    const res = await fetch(`/api/members/${memberId}/approve-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentDetails),
    });
    if (res.ok) {
      const data = await res.json();
      return sanitizeMember(data.member);
    }
  } catch (err) {
    console.warn('Could not approve payment on server:', err);
  }
  return null;
}

export async function serverUpdateRoutine(
  memberId: string,
  routines: any[]
): Promise<GymMember | null> {
  try {
    const res = await fetch(`/api/members/${memberId}/routine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routines }),
    });
    if (res.ok) {
      const data = await res.json();
      return sanitizeMember(data.member);
    }
  } catch (err) {
    console.warn('Could not update routine on server:', err);
  }
  return null;
}

export async function resetServerGymData(): Promise<{
  members: GymMember[];
  settings: GymSettings;
} | null> {
  try {
    const res = await fetch('/api/gym-data/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const sanitizedMembers = data.members.map((m: any, idx: number) => sanitizeMember(m, idx));
      const sanitizedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      return {
        members: sanitizedMembers,
        settings: sanitizedSettings,
      };
    }
  } catch (err) {
    console.error('Failed to reset server gym data:', err);
  }
  return null;
}
