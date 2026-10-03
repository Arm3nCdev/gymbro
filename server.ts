import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json({ limit: "15mb" }));

// Server-side persistent storage for multi-device sync
const DATA_FILE_PATH = path.join(process.cwd(), "gym_database.json");

interface ServerGymStore {
  members: any[];
  users: any[];
  settings: any;
  lastUpdated: number;
}

const DEFAULT_SERVER_SETTINGS = {
  gymName: "GymBro Fitness Center",
  tagline: "Fuerza, Salud y Rendimiento",
  phone: "+595 981 123456",
  address: "Av. Mariscal López 1250, Asunción, Paraguay",
  currencySymbol: "₲",
  monthlyDefaultPrice: 180000,
  ownerName: "Administrador",
  supportEmail: "administracion@gymbro.app",
};

// Owner account is seeded from the environment (OWNER_USERNAME / OWNER_PASSWORD / OWNER_NAME).
// Falls back to the demo account (admin / admin123); set OWNER_PASSWORD in production.
function buildInitialOwners(): any[] {
  const password = String(process.env.OWNER_PASSWORD || "admin123").trim();
  if (!process.env.OWNER_PASSWORD) {
    console.warn("[GymBro Server] OWNER_PASSWORD is not set: using the demo owner password (admin123).");
  }
  const username = String(process.env.OWNER_USERNAME || "admin").trim().toLowerCase();
  const name = String(process.env.OWNER_NAME || "Administrador").trim();
  return [
    {
      id: `usr_owner_${username}`,
      username,
      password,
      name,
      role: "owner",
      email: `${username}@gymbro.app`,
    },
  ];
}

const DEFAULT_INITIAL_USERS: any[] = buildInitialOwners();

// Make sure the configured owner can always log in, even on a database created
// before the owner credentials changed (adds it, or resets its password).
function withConfiguredOwner(users: any[]): any[] {
  const result = [...users];
  for (const owner of DEFAULT_INITIAL_USERS) {
    const index = result.findIndex((u: any) => String(u.username || "").toLowerCase() === owner.username);
    if (index === -1) result.push(owner);
    else result[index] = { ...result[index], password: owner.password, role: "owner" };
  }
  return result;
}

// Never send stored passwords back to any client.
function stripPasswords(users: any[]): any[] {
  return users.map(({ password: _password, ...rest }: any) => rest);
}

const DEFAULT_INITIAL_MEMBERS: any[] = [];

let inMemoryStore: ServerGymStore | null = null;

function loadServerGymStore(): ServerGymStore {
  if (inMemoryStore) return inMemoryStore;

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        inMemoryStore = {
          members: Array.isArray(parsed.members) && parsed.members.length > 0 ? parsed.members : DEFAULT_INITIAL_MEMBERS,
          users: withConfiguredOwner(Array.isArray(parsed.users) ? parsed.users : []),
          settings: { ...DEFAULT_SERVER_SETTINGS, ...(parsed.settings || {}) },
          lastUpdated: parsed.lastUpdated || Date.now(),
        };
        return inMemoryStore;
      }
    }
  } catch (err) {
    console.error("Error reading gym_database.json, falling back to clean state:", err);
  }

  inMemoryStore = {
    members: DEFAULT_INITIAL_MEMBERS,
    users: DEFAULT_INITIAL_USERS,
    settings: DEFAULT_SERVER_SETTINGS,
    lastUpdated: Date.now(),
  };

  saveServerGymStore(inMemoryStore);
  return inMemoryStore;
}

function saveServerGymStore(store: ServerGymStore): void {
  try {
    inMemoryStore = store;
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving gym_database.json:", err);
  }
}

// ---------------------------------------------------------------------------
// Sessions & role-based access
// ---------------------------------------------------------------------------

const SESSIONS_FILE_PATH = path.join(process.cwd(), "gym_sessions.json");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let sessions: Record<string, { userId: string; expiresAt: number }> = {};
try {
  if (fs.existsSync(SESSIONS_FILE_PATH)) {
    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE_PATH, "utf-8")) || {};
  }
} catch (err) {
  console.error("Error reading gym_sessions.json, starting without sessions:", err);
}

function saveSessions(): void {
  try {
    const now = Date.now();
    for (const [token, s] of Object.entries(sessions)) {
      if (s.expiresAt < now) delete sessions[token];
    }
    fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(sessions), { encoding: "utf-8", mode: 0o600 });
  } catch (err) {
    console.error("Error saving gym_sessions.json:", err);
  }
}

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
  saveSessions();
  return token;
}

function getRequestUser(req: express.Request): any | null {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const session = token ? sessions[token] : undefined;
  if (!session || session.expiresAt < Date.now()) return null;
  return loadServerGymStore().users.find((u: any) => u.id === session.userId) || null;
}

// Express middleware: only lets through requests from a logged-in user with one of the given roles.
function requireRole(...roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Sesión expirada. Vuelve a iniciar sesión." });
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    res.locals.user = user;
    next();
  };
}

function isAssignedToTrainer(member: any, trainer: any): boolean {
  return member.assignedTrainerId === trainer.id || member.assignedTrainerId === `usr_trainer_${trainer.username}`;
}

// Same rule as the trainer portal: own athletes plus members without a trainer.
function canAccessMember(user: any, member: any): boolean {
  if (!user || !member) return false;
  if (user.role === "owner") return true;
  if (user.role === "trainer") return !member.assignedTrainerId || isAssignedToTrainer(member, user);
  return user.role === "student" && member.id === user.memberId;
}

function visibleMembers(user: any, store: ServerGymStore): any[] {
  return store.members.filter((m: any) => canAccessMember(user, m));
}

function visibleUsers(user: any, store: ServerGymStore): any[] {
  if (user.role === "owner") return stripPasswords(store.users);
  return store.users
    .filter((u: any) => u.id === user.id || u.role === "trainer")
    .map((u: any) =>
      u.id === user.id
        ? stripPasswords([u])[0]
        : { id: u.id, username: u.username, name: u.name, role: u.role, specialty: u.specialty, avatar: u.avatar }
    );
}

// Fields that only change through the owner or the payment/assignment endpoints.
const PROTECTED_MEMBER_FIELDS = [
  "id",
  "planName",
  "planPrice",
  "paymentMethod",
  "paymentStatus",
  "paymentsHistory",
  "nextDueDate",
  "lastPaymentDate",
  "pendingPaymentApproval",
  "membershipType",
  "baseMembershipPrice",
  "hasPersonalTrainer",
  "personalTrainerPrice",
  "assignedTrainerId",
  "assignedTrainerName",
];

function publicUser(user: any, token?: string): any {
  const { password: _password, ...rest } = user;
  return token ? { ...rest, token } : rest;
}

// Lazy Google GenAI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "GymBro Server" });
});

// Helper: Generates realistic 6-day split with varied exercises
function generateServerWeeklyRoutines(prefix = "std") {
  const ts = Date.now();
  return [
    {
      id: `rout_${prefix}_lunes_${ts}`,
      dayOfWeek: "Lunes",
      title: "Pecho, Hombros & Tríceps (Empuje)",
      durationMin: 55,
      completedToday: false,
      exercises: [
        { id: `ex_${prefix}_lu_1`, name: "Press de Banca Plano con Barra", muscleGroup: "Pecho", sets: 4, reps: "10-12", targetWeightKg: 50, restSeconds: 90, notes: "Control en la bajada, retracción escapular.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_lu_2`, name: "Press Inclinado con Mancuernas", muscleGroup: "Pecho", sets: 4, reps: "10-12", targetWeightKg: 18, restSeconds: 75, notes: "Enfoque en porción clavicular.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_lu_3`, name: "Aperturas en Poleas / Peck Deck", muscleGroup: "Pecho", sets: 3, reps: "15", targetWeightKg: 25, restSeconds: 60, notes: "Pausa de 1 segundo en máxima contracción.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_lu_4`, name: "Extensión de Tríceps en Polea Alta", muscleGroup: "Tríceps", sets: 4, reps: "12-15", targetWeightKg: 20, restSeconds: 60, notes: "Codos pegados al torso.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_lu_5`, name: "Fondos en Paralelas Asistidos", muscleGroup: "Pecho & Tríceps", sets: 3, reps: "10-12", targetWeightKg: 0, restSeconds: 75, notes: "Inclinación suave adelante.", completedSets: [false, false, false] },
      ],
    },
    {
      id: `rout_${prefix}_martes_${ts}`,
      dayOfWeek: "Martes",
      title: "Espalda, Bíceps & Trapecio (Tracción)",
      durationMin: 55,
      completedToday: false,
      exercises: [
        { id: `ex_${prefix}_ma_1`, name: "Jalón al Pecho en Polea", muscleGroup: "Espalda", sets: 4, reps: "10-12", targetWeightKg: 45, restSeconds: 75, notes: "Llevar la barra hacia la clavícula activando dorsales.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_ma_2`, name: "Remo con Mancuerna en Banco", muscleGroup: "Espalda", sets: 4, reps: "10 c/lado", targetWeightKg: 22, restSeconds: 90, notes: "Espalda recta, codo guiado hacia la cadera.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_ma_3`, name: "Remo en Polea Baja (Gironda)", muscleGroup: "Espalda", sets: 3, reps: "12", targetWeightKg: 40, restSeconds: 60, notes: "Abrir el pecho en contracción.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_ma_4`, name: "Curl de Bíceps con Barra Z", muscleGroup: "Bíceps", sets: 4, reps: "12", targetWeightKg: 20, restSeconds: 60, notes: "Sin balanceo lumbar.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_ma_5`, name: "Curl Martillo con Mancuernas", muscleGroup: "Bíceps", sets: 3, reps: "12", targetWeightKg: 12, restSeconds: 60, notes: "Agarre neutro para braquial.", completedSets: [false, false, false] },
      ],
    },
    {
      id: `rout_${prefix}_miercoles_${ts}`,
      dayOfWeek: "Miércoles",
      title: "Piernas Completas & Glúteos (Inferior)",
      durationMin: 60,
      completedToday: false,
      exercises: [
        { id: `ex_${prefix}_mi_1`, name: "Sentadilla Libre con Barra", muscleGroup: "Piernas", sets: 4, reps: "8-10", targetWeightKg: 60, restSeconds: 120, notes: "Profundidad paralela y rodillas alineadas.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_mi_2`, name: "Prensa Inclinada 45°", muscleGroup: "Piernas", sets: 4, reps: "12-15", targetWeightKg: 90, restSeconds: 90, notes: "No bloquear rodillas al extender.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_mi_3`, name: "Sillón de Cuádriceps (Extensiones)", muscleGroup: "Cuádriceps", sets: 3, reps: "15", targetWeightKg: 35, restSeconds: 60, notes: "Control en la bajada.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_mi_4`, name: "Curl Femoral Tumbado", muscleGroup: "Isquiosurales", sets: 4, reps: "12", targetWeightKg: 30, restSeconds: 60, notes: "Cadera apoyada en el banco.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_mi_5`, name: "Elevación de Gemelos de Pie", muscleGroup: "Gemelos", sets: 4, reps: "15-20", targetWeightKg: 45, restSeconds: 45, notes: "Rango amplio de estiramiento.", completedSets: [false, false, false, false] },
      ],
    },
    {
      id: `rout_${prefix}_jueves_${ts}`,
      dayOfWeek: "Jueves",
      title: "Hombros, Trapecio & Core Abdominal",
      durationMin: 50,
      completedToday: false,
      exercises: [
        { id: `ex_${prefix}_ju_1`, name: "Press Militar de Hombros", muscleGroup: "Hombros", sets: 4, reps: "10-12", targetWeightKg: 16, restSeconds: 75, notes: "Espalda apoyada en respaldo 80°.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_ju_2`, name: "Elevaciones Laterales con Mancuerna", muscleGroup: "Hombros", sets: 4, reps: "15", targetWeightKg: 8, restSeconds: 45, notes: "Subir en plano escapular.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_ju_3`, name: "Pájaros / Deltoides Posterior", muscleGroup: "Hombros", sets: 4, reps: "15", targetWeightKg: 10, restSeconds: 45, notes: "Aislar deltoides posterior.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_ju_4`, name: "Encogimientos de Trapecio con Mancuerna", muscleGroup: "Trapecio", sets: 3, reps: "12", targetWeightKg: 24, restSeconds: 60, notes: "Subida vertical limpia.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_ju_5`, name: "Plancha Abdominal Isométrica", muscleGroup: "Core", sets: 3, reps: "45 seg", targetWeightKg: 0, restSeconds: 45, notes: "Glúteos y abdomen apretados.", completedSets: [false, false, false] },
      ],
    },
    {
      id: `rout_${prefix}_viernes_${ts}`,
      dayOfWeek: "Viernes",
      title: "Brazos, Core & Hipertrofia",
      durationMin: 55,
      completedToday: false,
      exercises: [
        { id: `ex_${prefix}_vi_1`, name: "Curl Bíceps en Banco Scott (Predicador)", muscleGroup: "Bíceps", sets: 4, reps: "10-12", targetWeightKg: 20, restSeconds: 60, notes: "Aislar cabeza corta del bíceps.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_vi_2`, name: "Press Francés con Barra Z", muscleGroup: "Tríceps", sets: 4, reps: "10-12", targetWeightKg: 18, restSeconds: 60, notes: "Codos apuntando al techo.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_vi_3`, name: "Elevación de Piernas en Barra", muscleGroup: "Core", sets: 3, reps: "15", targetWeightKg: 0, restSeconds: 45, notes: "Sin balanceo.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_vi_4`, name: "Crunch en Polea Alta", muscleGroup: "Core", sets: 3, reps: "15", targetWeightKg: 30, restSeconds: 45, notes: "Flexión activa de columna.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_vi_5`, name: "HIIT en Cinta Inclinada", muscleGroup: "Cardio", sets: 1, reps: "20 min", targetWeightKg: 0, restSeconds: 0, notes: "Intervalos de aceleración.", completedSets: [false] },
      ],
    },
    {
      id: `rout_${prefix}_sabado_${ts}`,
      dayOfWeek: "Sábado",
      title: "Full Body Funcional & Movilidad",
      durationMin: 45,
      completedToday: false,
      exercises: [
        { id: `ex_${prefix}_sa_1`, name: "Peso Muerto Rumano", muscleGroup: "Espalda & Isquios", sets: 4, reps: "10", targetWeightKg: 50, restSeconds: 90, notes: "Bisagra de cadera con espalda neutra.", completedSets: [false, false, false, false] },
        { id: `ex_${prefix}_sa_2`, name: "Zancadas Caminando con Mancuernas", muscleGroup: "Piernas & Glúteos", sets: 3, reps: "12 c/lado", targetWeightKg: 12, restSeconds: 75, notes: "Paso largo y torso firme.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_sa_3`, name: "Flexiones de Brazos (Push Ups)", muscleGroup: "Pecho & Core", sets: 3, reps: "15", targetWeightKg: 0, restSeconds: 60, notes: "Pecho toca el suelo.", completedSets: [false, false, false] },
        { id: `ex_${prefix}_sa_4`, name: "Movilidad Articular & Estiramientos", muscleGroup: "Movilidad", sets: 1, reps: "15 min", targetWeightKg: 0, restSeconds: 0, notes: "Recuperación activa y flexibilidad.", completedSets: [false] },
      ],
    },
  ];
}

// API: Multi-device Data Synchronization (Computer <-> Cellphone)
// Each role only receives what its portal shows: owner everything, trainer own + free athletes, student itself.
app.get("/api/gym-data", requireRole(), (_req, res) => {
  const store = loadServerGymStore();
  const user = res.locals.user;
  res.json({
    members: visibleMembers(user, store),
    users: visibleUsers(user, store),
    settings: store.settings,
    lastUpdated: store.lastUpdated,
  });
});

app.post("/api/gym-data", requireRole(), (req, res) => {
  try {
    const { members, users, settings } = req.body;
    const store = loadServerGymStore();
    const user = res.locals.user;
    const isOwner = user.role === "owner";

    if (Array.isArray(members)) {
      if (isOwner) {
        store.members = members;
      } else {
        // Trainers and students only update members they can see, never their payment or assignment data.
        store.members = store.members.map((existing: any) => {
          const incoming = members.find((m: any) => m && m.id === existing.id);
          if (!incoming || !canAccessMember(user, existing)) return existing;
          const merged = { ...existing, ...incoming };
          for (const field of PROTECTED_MEMBER_FIELDS) {
            if (field in existing) merged[field] = existing[field];
            else delete merged[field];
          }
          return merged;
        });
      }
    }
    if (isOwner && Array.isArray(users)) {
      // Clients receive users without passwords, so keep the stored password and role of
      // known accounts, keep owners untouchable, and never let a sync create a new owner.
      const owners = store.users.filter((u: any) => u.role === "owner");
      const synced = users
        .filter((u: any) => u && u.id && u.username && u.role !== "owner")
        .filter((u: any) => !owners.some((o: any) => o.id === u.id))
        .map((u: any) => {
          const existing = store.users.find((s: any) => s.id === u.id);
          return existing ? { ...u, password: existing.password, role: existing.role } : u;
        })
        .filter((u: any) => u.password);
      store.users = [...owners, ...synced];
    }
    if (isOwner && settings && typeof settings === "object") {
      store.settings = { ...store.settings, ...settings };
    }
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    const visible = visibleMembers(user, store);
    res.json({
      success: true,
      lastUpdated: store.lastUpdated,
      membersCount: visible.length,
      members: visible,
      users: visibleUsers(user, store),
      settings: store.settings,
    });
  } catch (err: any) {
    console.error("Error in POST /api/gym-data:", err);
    res.status(500).json({ error: err?.message || "Failed to save gym data" });
  }
});

// API: Registered users list (trainer directory for everyone, full list only for the owner)
app.get("/api/users", (req, res) => {
  const store = loadServerGymStore();
  const user = getRequestUser(req);
  if (user) return res.json({ users: visibleUsers(user, store) });
  const trainers = store.users
    .filter((u: any) => u.role === "trainer")
    .map((u: any) => ({ id: u.id, username: u.username, name: u.name, role: u.role, specialty: u.specialty, avatar: u.avatar }));
  res.json({ users: trainers });
});

// API: User Registration (Owner, Trainer, Student)
app.post("/api/users/register", (req, res) => {
  try {
    const { username, password, name, role, email, phone, specialty, member } = req.body;
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();
    const cleanName = String(name || "").trim();

    if (!cleanUsername) return res.status(400).json({ error: "El usuario es obligatorio." });
    if (!cleanPassword || cleanPassword.length < 3) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 3 caracteres." });
    }
    if (!cleanName) return res.status(400).json({ error: "El nombre es obligatorio." });
    if (role !== "student" && role !== "trainer") {
      return res.status(403).json({ error: "Las cuentas de Dueño / Administración no se crean desde la web." });
    }

    const store = loadServerGymStore();
    const exists = store.users.find(
      (u: any) => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername)
    );
    if (exists) {
      return res.status(400).json({ error: "Este nombre de usuario ya está registrado." });
    }

    const userId = `usr_${role || "user"}_${Date.now()}`;
    let memberId = member?.id;

    // If student, link/create member object in central members store
    if (role === "student") {
      if (!memberId) {
        memberId = `mem_${Date.now()}`;
      }

      // A self-registered student always starts with the membership unpaid, whatever the client sends.
      const newMemberObj = member ? {
        ...member,
        id: memberId,
        paymentStatus: "pendiente",
        paymentsHistory: [],
        lastPaymentDate: undefined,
        pendingPaymentApproval: undefined,
      } : {
        id: memberId,
        name: cleanName,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
        email: email || `${cleanUsername}@gymbro.app`,
        phone: phone || "+595 981 000000",
        memberSince: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
        planName: "Pase Libre Total Musculación",
        planPrice: store.settings.monthlyDefaultPrice || 180000,
        paymentMethod: "efectivo",
        paymentStatus: "pendiente",
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        daysAbsent: 0,
        streakDays: 0,
        lastAttended: "Recién registrado",
        goal: "Fuerza, salud y acondicionamiento físico",
        todayMood: "energia",
        todayWorkoutCompleted: false,
        paymentsHistory: [],
        routines: generateServerWeeklyRoutines(memberId),
        weightHistory: [],
        photos: [],
        messages: [
          {
            id: `msg_welcome_${Date.now()}`,
            type: "support_motivational",
            title: `¡Bienvenido a ${store.settings.gymName || "GymBro"}! 💪🔥`,
            content: `¡Hola ${cleanName}! Te damos la bienvenida a tu portal de entrenamiento. Una vez confirmada tu cuota mensual en recepción o por transferencia, tu rutina diaria quedará 100% liberada. ¡A entrenar con todo!`,
            date: "Hoy",
            sender: "Administración GymBro",
            read: false,
          },
        ],
      };

      // Add to store.members if not present
      if (!store.members.some((m: any) => m.id === memberId)) {
        store.members.unshift(newMemberObj);
      }
    }

    const newUserRecord = {
      id: userId,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      role: role || "student",
      memberId: memberId || undefined,
      email: email || `${cleanUsername}@gymbro.app`,
      phone: phone || undefined,
      specialty: specialty || undefined,
    };

    store.users.push(newUserRecord);
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({
      success: true,
      user: publicUser(newUserRecord, createSession(userId)),
      members: visibleMembers(newUserRecord, store),
      users: visibleUsers(newUserRecord, store),
    });
  } catch (err: any) {
    console.error("Error in /api/users/register:", err);
    res.status(500).json({ error: err?.message || "Error al registrar usuario." });
  }
});

// API: User Login
app.post("/api/users/login", (req, res) => {
  try {
    const { username, password, expectedRole } = req.body;
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({ error: "Ingresa tu usuario y contraseña." });
    }

    const store = loadServerGymStore();
    const user = store.users.find(
      (u: any) =>
        (u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername)) &&
        u.password === cleanPassword
    );

    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }

    if (expectedRole && user.role !== expectedRole) {
      const roleLabels: Record<string, string> = {
        owner: "Dueño / Administración",
        trainer: "Entrenador",
        student: "Alumno",
      };
      return res.status(403).json({
        error: `Esta cuenta corresponde a "${roleLabels[user.role] || user.role}". Usa el enlace correspondiente.`,
      });
    }

    res.json({
      success: true,
      user: publicUser(user, createSession(user.id)),
      members: visibleMembers(user, store),
    });
  } catch (err: any) {
    console.error("Error in /api/users/login:", err);
    res.status(500).json({ error: err?.message || "Error al iniciar sesión." });
  }
});

// API: Find account for password recovery (Student, Trainer, Owner)
app.post("/api/users/find-account", (req, res) => {
  try {
    const { identifier, expectedRole } = req.body;
    const cleanId = String(identifier || "").trim().toLowerCase();
    if (!cleanId) {
      return res.status(400).json({ error: "Ingresa tu nombre de usuario, correo o teléfono." });
    }

    const store = loadServerGymStore();
    const cleanDigits = cleanId.replace(/\D/g, "");

    let user = store.users.find((u: any) => {
      const matchUser = u.username && u.username.toLowerCase() === cleanId;
      const matchEmail = u.email && u.email.toLowerCase() === cleanId;
      const userPhoneDigits = u.phone ? u.phone.replace(/\D/g, "") : "";
      const matchPhone = cleanDigits.length >= 6 && userPhoneDigits.includes(cleanDigits);
      const matchName = u.name && u.name.toLowerCase() === cleanId;
      const roleMatches = !expectedRole || u.role === expectedRole;
      return (matchUser || matchEmail || matchPhone || matchName) && roleMatches;
    });

    // If not found in users and searching for student or general, check gym members
    if (!user && (!expectedRole || expectedRole === "student")) {
      const matchedMember = store.members.find((m: any) => {
        const mName = (m.name || "").toLowerCase();
        const mEmail = (m.email || "").toLowerCase();
        const mPhoneDigits = (m.phone || "").replace(/\D/g, "");
        const matchName = mName === cleanId;
        const matchEmail = mEmail && mEmail === cleanId;
        const matchPhone = cleanDigits.length >= 6 && mPhoneDigits.includes(cleanDigits);
        return matchName || matchEmail || matchPhone;
      });

      if (matchedMember) {
        // Look up if user already exists for this member
        user = store.users.find((u: any) => u.memberId === matchedMember.id);
        if (!user) {
          const autoUser = matchedMember.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || `alumno_${Date.now()}`;
          user = {
            id: `usr_student_${Date.now()}`,
            username: autoUser,
            name: matchedMember.name,
            role: "student",
            memberId: matchedMember.id,
            email: matchedMember.email,
            phone: matchedMember.phone,
            avatar: matchedMember.avatar,
          };
          store.users.push(user);
          store.lastUpdated = Date.now();
          saveServerGymStore(store);
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        error: "No encontramos ninguna cuenta con esos datos. Verifica que el usuario, correo o teléfono esté bien escrito.",
      });
    }

    if (user.role === "owner") {
      return res.status(403).json({
        error: "La clave de Dueño / Administración no se recupera desde la web. Contacta al soporte técnico.",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        memberId: user.memberId,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/users/find-account:", err);
    res.status(500).json({ error: err?.message || "Error al buscar cuenta." });
  }
});

// API: Reset Password (Student, Trainer, Owner)
app.post("/api/users/reset-password", (req, res) => {
  try {
    const { identifier, userId, newPassword, expectedRole } = req.body;
    const cleanPass = String(newPassword || "").trim();
    if (!cleanPass || cleanPass.length < 3) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 3 caracteres." });
    }

    const cleanId = String(identifier || "").trim().toLowerCase();
    const cleanDigits = cleanId.replace(/\D/g, "");
    const store = loadServerGymStore();

    let userIndex = store.users.findIndex((u: any) => {
      if (userId && u.id === userId) return true;
      if (!cleanId) return false;
      const matchUser = u.username && u.username.toLowerCase() === cleanId;
      const matchEmail = u.email && u.email.toLowerCase() === cleanId;
      const userPhoneDigits = u.phone ? u.phone.replace(/\D/g, "") : "";
      const matchPhone = cleanDigits.length >= 6 && userPhoneDigits.includes(cleanDigits);
      const matchName = u.name && u.name.toLowerCase() === cleanId;
      const roleMatches = !expectedRole || u.role === expectedRole;
      return (matchUser || matchEmail || matchPhone || matchName) && roleMatches;
    });

    if (userIndex === -1 && (!expectedRole || expectedRole === "student")) {
      const matchedMember = store.members.find((m: any) => {
        const mName = (m.name || "").toLowerCase();
        const mEmail = (m.email || "").toLowerCase();
        const mPhoneDigits = (m.phone || "").replace(/\D/g, "");
        const matchName = mName === cleanId;
        const matchEmail = mEmail && mEmail === cleanId;
        const matchPhone = cleanDigits.length >= 6 && mPhoneDigits.includes(cleanDigits);
        return matchName || matchEmail || matchPhone;
      });

      if (matchedMember) {
        const autoUser = matchedMember.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || `alumno_${Date.now()}`;
        const newRecord = {
          id: `usr_student_${Date.now()}`,
          username: autoUser,
          password: cleanPass,
          name: matchedMember.name,
          role: "student",
          memberId: matchedMember.id,
          email: matchedMember.email,
          phone: matchedMember.phone,
          avatar: matchedMember.avatar,
        };
        store.users.push(newRecord);
        store.lastUpdated = Date.now();
        saveServerGymStore(store);

        return res.json({
          success: true,
          message: "¡Contraseña actualizada exitosamente!",
          user: publicUser(newRecord, createSession(newRecord.id)),
        });
      }
    }

    if (userIndex === -1) {
      return res.status(404).json({ error: "No se encontró la cuenta para restablecer la contraseña." });
    }

    if (store.users[userIndex].role === "owner") {
      return res.status(403).json({
        error: "La clave de Dueño / Administración no se recupera desde la web. Contacta al soporte técnico.",
      });
    }

    store.users[userIndex].password = cleanPass;
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    const updatedUser = store.users[userIndex];
    res.json({
      success: true,
      message: "¡Contraseña actualizada exitosamente!",
      user: publicUser(updatedUser, createSession(updatedUser.id)),
    });
  } catch (err: any) {
    console.error("Error in /api/users/reset-password:", err);
    res.status(500).json({ error: err?.message || "Error al restablecer contraseña." });
  }
});

// API: Direct creation of trainer or student by owner
app.post("/api/users/direct-create", requireRole("owner"), (req, res) => {
  try {
    const { username, password, name, role, email, phone, specialty, planPrice } = req.body;
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();
    const cleanName = String(name || "").trim();

    if (!cleanUsername) return res.status(400).json({ error: "Usuario obligatorio." });
    if (!cleanPassword) return res.status(400).json({ error: "Contraseña obligatoria." });
    if (!cleanName) return res.status(400).json({ error: "Nombre obligatorio." });
    if (role !== "student" && role !== "trainer") {
      return res.status(403).json({ error: "Solo se pueden crear profesores o alumnos." });
    }

    const store = loadServerGymStore();
    if (store.users.some((u: any) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: "Este nombre de usuario ya existe." });
    }

    const userId = `usr_${role}_${Date.now()}`;
    let memberId: string | undefined = undefined;

    if (role === "student") {
      memberId = `mem_${Date.now()}`;
      const newMemberObj = {
        id: memberId,
        name: cleanName,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
        email: email || `${cleanUsername}@gymbro.app`,
        phone: phone || "+595 981 000000",
        memberSince: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
        planName: "Pase Libre Total Musculación",
        planPrice: Number(planPrice) || store.settings.monthlyDefaultPrice || 180000,
        paymentMethod: "efectivo",
        paymentStatus: "pendiente",
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        daysAbsent: 0,
        streakDays: 0,
        lastAttended: "Asignado por Gimnasio",
        goal: "Fuerza, hipertrofia y salud general",
        todayMood: "energia",
        todayWorkoutCompleted: false,
        paymentsHistory: [],
        routines: generateServerWeeklyRoutines(memberId),
        weightHistory: [],
        photos: [],
        messages: [
          {
            id: `msg_welcome_${Date.now()}`,
            type: "support_motivational",
            title: `¡Bienvenido a ${store.settings.gymName || "GymBro"}! 💪`,
            content: `¡Hola ${cleanName}! El gimnasio te ha creado tu cuenta oficial. Aquí podrás seguir tus rutinas y ver tus cuotas. ¡A darle con todo!`,
            date: "Hoy",
            sender: "Administración GymBro",
            read: false,
          },
        ],
      };
      store.members.unshift(newMemberObj);
    }

    const newUserRecord = {
      id: userId,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      role: role || "student",
      memberId,
      email: email || `${cleanUsername}@gymbro.app`,
      phone: phone || undefined,
      specialty: specialty || undefined,
    };

    store.users.push(newUserRecord);
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    const { password: _password, ...publicUserRecord } = newUserRecord;
    res.json({
      success: true,
      user: publicUserRecord,
      member: memberId ? store.members.find((m: any) => m.id === memberId) : undefined,
      members: store.members,
      users: stripPasswords(store.users),
    });
  } catch (err: any) {
    console.error("Error in /api/users/direct-create:", err);
    res.status(500).json({ error: err?.message || "Error al crear usuario directamente." });
  }
});

// API: Update User Profile (Dueño, Coach, Alumno)
app.post("/api/users/profile", requireRole(), (req, res) => {
  try {
    const { userId, name, avatar, birthDate, bio, description, phone, email, specialty, goal } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Falta userId." });
    }
    if (userId !== res.locals.user.id && res.locals.user.role !== "owner") {
      return res.status(403).json({ error: "Solo puedes editar tu propio perfil." });
    }

    const store = loadServerGymStore();
    const userIndex = store.users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const targetUser = store.users[userIndex];
    if (name) targetUser.name = String(name).trim();
    if (avatar) targetUser.avatar = String(avatar).trim();
    if (birthDate !== undefined) targetUser.birthDate = String(birthDate).trim();
    if (bio !== undefined) targetUser.bio = String(bio).trim();
    if (description !== undefined) targetUser.description = String(description).trim();
    if (phone !== undefined) targetUser.phone = String(phone).trim();
    if (email !== undefined) targetUser.email = String(email).trim();
    if (specialty !== undefined) targetUser.specialty = String(specialty).trim();

    // If user is linked to a GymMember (student), update the student record too
    let updatedMember: any = undefined;
    if (targetUser.memberId) {
      const member = store.members.find((m: any) => m.id === targetUser.memberId);
      if (member) {
        if (name) member.name = String(name).trim();
        if (avatar) member.avatar = String(avatar).trim();
        if (birthDate !== undefined) member.birthDate = String(birthDate).trim();
        if (phone !== undefined) member.phone = String(phone).trim();
        if (email !== undefined) member.email = String(email).trim();
        if (bio !== undefined || description !== undefined) {
          member.bio = String(bio || description || '').trim();
          member.description = member.bio;
        }
        if (goal) member.goal = String(goal).trim();
        updatedMember = member;
      }
    }

    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        role: targetUser.role,
        memberId: targetUser.memberId,
        email: targetUser.email,
        phone: targetUser.phone,
        specialty: targetUser.specialty,
        avatar: targetUser.avatar,
        birthDate: targetUser.birthDate,
        bio: targetUser.bio,
        description: targetUser.description,
      },
      member: updatedMember,
      members: visibleMembers(res.locals.user, store),
      users: visibleUsers(res.locals.user, store),
    });
  } catch (err: any) {
    console.error("Error in /api/users/profile:", err);
    res.status(500).json({ error: err?.message || "Error al actualizar perfil." });
  }
});

// API: Add Student Progress & Control Metric (Weight, Measurements, Photo, Notes)
app.post("/api/members/:id/progress", requireRole(), (req, res) => {
  try {
    const { id } = req.params;
    const { weightKg, waistCm, chestCm, armCm, legCm, note, photoUrl, photoTag, loggedBy } = req.body;

    const store = loadServerGymStore();
    const member = store.members.find((m: any) => m.id === id);
    if (!member) {
      return res.status(404).json({ error: "Socio no encontrado." });
    }
    if (!canAccessMember(res.locals.user, member)) {
      return res.status(403).json({ error: "No tienes acceso a este socio." });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const metricId = `w_${Date.now()}`;

    const newMetric: any = {
      id: metricId,
      date: todayStr,
      weightKg: Number(weightKg) || 0,
      note: note ? String(note).trim() : undefined,
      waistCm: waistCm ? Number(waistCm) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
      armCm: armCm ? Number(armCm) : undefined,
      legCm: legCm ? Number(legCm) : undefined,
      photoUrl: photoUrl || undefined,
      loggedBy: loggedBy || "student",
    };

    if (!Array.isArray(member.weightHistory)) {
      member.weightHistory = [];
    }
    member.weightHistory.push(newMetric);

    // If a photo was attached, add to photos gallery
    if (photoUrl) {
      if (!Array.isArray(member.photos)) {
        member.photos = [];
      }
      member.photos.unshift({
        id: `photo_${Date.now()}`,
        date: todayStr,
        imageUrl: photoUrl,
        tag: photoTag || "General",
        weightKg: Number(weightKg) || undefined,
        note: note ? String(note).trim() : undefined,
      });
    }

    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({
      success: true,
      member,
      members: visibleMembers(res.locals.user, store),
    });
  } catch (err: any) {
    console.error("Error in /api/members/:id/progress:", err);
    res.status(500).json({ error: err?.message || "Error al registrar control de progreso." });
  }
});

// API: Student notifies payment
app.post("/api/members/:id/notify-payment", requireRole("student", "owner"), (req, res) => {
  try {
    const { id } = req.params;
    const { method, note } = req.body;
    const store = loadServerGymStore();
    const member = store.members.find((m: any) => m.id === id);

    if (!member) {
      return res.status(404).json({ error: "Socio no encontrado." });
    }
    if (!canAccessMember(res.locals.user, member)) {
      return res.status(403).json({ error: "No tienes acceso a este socio." });
    }

    member.pendingPaymentApproval = {
      requestedAt: new Date().toISOString(),
      method: method || "efectivo",
      note: note || `Aviso de pago por ${method === "efectivo" ? "Efectivo en recepción" : "Transferencia bancaria"}`,
    };

    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({ success: true, member, members: visibleMembers(res.locals.user, store) });
  } catch (err: any) {
    console.error("Error in /api/members/:id/notify-payment:", err);
    res.status(500).json({ error: err?.message || "Error al notificar pago." });
  }
});

// API: Owner / Trainer approves payment (Gated release)
app.post("/api/members/:id/approve-payment", requireRole("owner", "trainer"), (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, receiptNote } = req.body;
    const store = loadServerGymStore();
    const member = store.members.find((m: any) => m.id === id);

    if (!member) {
      return res.status(404).json({ error: "Socio no encontrado." });
    }
    if (!canAccessMember(res.locals.user, member)) {
      return res.status(403).json({ error: "No tienes acceso a este socio." });
    }

    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextDueDate = nextMonth.toISOString().split("T")[0];

    const currentMonthName = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const formattedPeriod = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

    const paymentAmount = Number(amount) || member.planPrice || 180000;
    const paymentMethod = method || member.pendingPaymentApproval?.method || member.paymentMethod || "efectivo";

    const newPaymentRecord = {
      id: `pay_${Date.now()}`,
      date: today,
      amount: paymentAmount,
      method: paymentMethod,
      period: formattedPeriod,
      receiptNote:
        receiptNote ||
        `Cobro verificado y aprobado por el gimnasio (${paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"})`,
      verified: true,
    };

    member.paymentStatus = "al_dia";
    member.paymentMethod = paymentMethod;
    member.lastPaymentDate = today;
    member.nextDueDate = nextDueDate;
    member.pendingPaymentApproval = undefined;
    member.paymentsHistory = [newPaymentRecord, ...(member.paymentsHistory || [])];

    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({ success: true, member, members: visibleMembers(res.locals.user, store) });
  } catch (err: any) {
    console.error("Error in /api/members/:id/approve-payment:", err);
    res.status(500).json({ error: err?.message || "Error al aprobar cobro." });
  }
});

// API: Update member routine (Trainer or Owner)
app.post("/api/members/:id/routine", requireRole("owner", "trainer"), (req, res) => {
  try {
    const { id } = req.params;
    const { routines } = req.body;
    const store = loadServerGymStore();
    const member = store.members.find((m: any) => m.id === id);

    if (!member) {
      return res.status(404).json({ error: "Socio no encontrado." });
    }
    if (!canAccessMember(res.locals.user, member)) {
      return res.status(403).json({ error: "No tienes acceso a este socio." });
    }

    member.routines = routines;
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({ success: true, member, members: visibleMembers(res.locals.user, store) });
  } catch (err: any) {
    console.error("Error in /api/members/:id/routine:", err);
    res.status(500).json({ error: err?.message || "Error al actualizar rutina." });
  }
});

// API: Reset database to clean state (0 members, owner accounts kept with their current password)
app.post(["/api/gym-data/clear-all", "/api/gym-data/reset"], requireRole("owner"), (_req, res) => {
  try {
    const current = loadServerGymStore();
    const owners = current.users.filter((u: any) => u.role === "owner");
    const store: ServerGymStore = {
      members: [],
      users: owners.length > 0 ? owners : DEFAULT_INITIAL_USERS,
      settings: DEFAULT_SERVER_SETTINGS,
      lastUpdated: Date.now(),
    };
    saveServerGymStore(store);
    res.json({ success: true, ...store, users: stripPasswords(store.users) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to clear all data" });
  }
});

// API: Generate GymBro AI Messages
app.post("/api/ai/message", requireRole(), async (req, res) => {
  try {
    const { type, clientName, daysAbsent, paymentStatus, paymentMethod, amount, mood, customContext } = req.body;
    const ai = getGenAI();

    let prompt = "";
    if (type === "payment_reminder") {
      prompt = `Eres el entrenador y dueño del gimnasio "GymBro". Escribe un mensaje cordial, profesional y cercano para recordar el pago de la cuota del gimnasio a ${clientName || "el socio"}.
Detalles:
- Monto adeudado: ${amount ? `₲ ${Number(amount).toLocaleString('es-PY')}` : "la cuota mensual en Guaraníes (₲)"}
- Método habitual: ${paymentMethod || "Efectivo o Transferencia bancaria"}
- Estado: ${paymentStatus || "Pendiente"}
Instrucciones: Que sea breve, educado, amigable, con datos claros para pagar (menciona que puede ser efectivo o transferencia) y un toque motivador para que siga entrenando. No agregues corchetes ni texto de marcador de posición.`;
    } else if (type === "workout_reminder") {
      prompt = `Eres el coach del gimnasio "GymBro". Escribe una notificación breve, enérgica y motivadora para recordarle a ${clientName || "el socio"} su entrenamiento programado para hoy.
Contexto adicional: ${customContext || "Hoy toca darlo todo"}.
Incluye un emoji motivador, un tono de camaradería de gimnasio y que no supere los 3 renglones.`;
    } else if (type === "absent_funny") {
      prompt = `Eres el dueño o compañero de entrenamiento en el gimnasio "GymBro". Escribe un mensaje divertido, sarcástico con cariño y muy de la cultura fitness/gymbro para ${clientName || "el socio"}, que lleva ${daysAbsent || 3} días sin aparecer al gimnasio.
Puntos clave:
- Haz una broma simpática sobre las mancuernas extrañándolo, que el cardio se acumula, o que el sillón lo secuestró.
- Tono amistoso de "te extrañamos en el gym, vení hoy".
- Máximo 3 o 4 oraciones. Debe sacarle una sonrisa e impulsarlo a ir a entrenar hoy mismo.`;
    } else if (type === "support_motivational") {
      prompt = `Eres el coach de gimnasio "GymBro", empático, comprensivo y motivador. ${clientName || "El socio"} te comentó que hoy se siente: "${mood || "desanimado / cansado / con dolor"}".
${customContext ? `Detalles: ${customContext}` : ""}
Escribe un mensaje de apoyo genuino, empático y motivador:
- Reconoce que los días difíciles o el cansancio son normales en el camino del fitness.
- Aconséjale que incluso venir a hacer una rutina más suave de movilidad/estiramiento o descansar adecuadamente es parte de la salud.
- Dale palabras de aliento reales que lo hagan sentir valorado y respaldado en su proceso de salud integral.
- Máximo 4 oraciones.`;
    } else {
      prompt = `Escribe un mensaje motivador y enérgico de gimnasio para ${clientName || "el socio"} de GymBro sobre constancia y superación. Contexto: ${customContext || "Objetivo de salud general"}.`;
    }

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 0.8,
            maxOutputTokens: 250,
          },
        });
        const text = response.text?.trim();
        if (text) {
          return res.json({ message: text, generatedBy: "gemini-3.8-flash" });
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to smart template:", geminiError);
      }
    }

    // Fallbacks if no Gemini key or on error
    let fallbackText = "";
    if (type === "payment_reminder") {
      const formattedAmount = amount ? `₲ ${Number(amount).toLocaleString('es-PY')}` : "₲ 180.000";
      fallbackText = `¡Hola ${clientName || "Gymbro"}! 💪 Te escribo desde GymBro para recordarte con buena onda que tu cuota de este mes (${formattedAmount}) está lista para renovar. Podés abonar tanto en efectivo al ingresar como por transferencia bancaria. ¡Avisanos cualquier duda y nos vemos en el salón para seguir sumando repes!`;
    } else if (type === "workout_reminder") {
      fallbackText = `¡Arriba ${clientName || "campeón"}! ⚡ Hoy tenés tu entrenamiento programado en GymBro. La constancia es lo que forja el resultado. Prepará las zapas y la botella que te estamos esperando en la sala de pesas. ¡A romperla! 🔥`;
    } else if (type === "absent_funny") {
      const funnyQuotes = [
        `¡Atención ${clientName || "Gymbro"}! 🚨 La policía del fitness emitió alerta de búsqueda: llevás ${daysAbsent || 3} días desaparecido. Las mancuernas de 12kg preguntan por vos entre lágrimas. ¡Vení hoy que el sillón no da masa muscular! 😂🏋️‍♂️`,
        `Che ${clientName || "fiera"}, ¿te secuestró la pereza o qué pasó? 👀 Las máquinas de GymBro están juntando polvo esperándote. ¡Vení aunque sea a hacer media horita que te guardamos lugar! 💪🍕❌`,
        `¡Alerta de catabolismo! 😱 ${clientName || "Amigo"}, la leyenda dice que faltar ${daysAbsent || 3} días transforma el press de banca en un recuerdo lejano. ¡Te esperamos hoy para meterle pata! 🔥`
      ];
      fallbackText = funnyQuotes[Math.floor(Math.random() * funnyQuotes.length)];
    } else if (type === "support_motivational") {
      fallbackText = `Hola ${clientName || "amigo"}, entiendo totalmente que hoy estés ${mood || "con poca energía o cansado"}. Escuchar a tu cuerpo es parte clave del progreso a largo plazo. Si podés, date una vuelta para mover el cuerpo suave, estirar y despejar la mente; y si necesitás frenar hoy, descansá con la conciencia tranquila. ¡Acá en GymBro siempre te bancamos! 💛💪`;
    } else {
      fallbackText = `¡Vamos con todo ${clientName || "Gymbro"}! Cada repetición cuenta, incluso en los días donde cuesta arrancar. ¡A darle con constancia! 🔥`;
    }

    return res.json({ message: fallbackText, generatedBy: "template_fallback" });
  } catch (error: any) {
    console.error("Error in /api/ai/message:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// API: Generate or Optimize Custom Routine with AI
app.post("/api/ai/routine", requireRole(), async (req, res) => {
  try {
    const { clientName, goal, daysPerWeek, level, injuriesNotes } = req.body;
    const ai = getGenAI();

    if (ai) {
      try {
        const prompt = `Genera un plan de rutina personalizado en formato JSON para un cliente de gimnasio "GymBro".
Datos del alumno:
- Nombre: ${clientName || "Alumno"}
- Objetivo: ${goal || "Hipertrofia y salud general"}
- Días por semana: ${daysPerWeek || 3}
- Nivel: ${level || "Intermedio"}
- Lesiones o limitaciones: ${injuriesNotes || "Ninguna reportada"}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown adicional):
{
  "routineName": "Nombre motivador de la rutina",
  "focus": "Objetivo principal",
  "days": [
    {
      "dayName": "Lunes",
      "title": "Pecho y Tríceps",
      "durationMin": 50,
      "exercises": [
        {
          "name": "Press de Banca con Barra",
          "muscleGroup": "Pecho",
          "sets": 4,
          "reps": "10-12",
          "restSeconds": 90,
          "targetWeightKg": 60,
          "notes": "Retracción escapular y control en la bajada"
        }
      ]
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 0.6,
            responseMimeType: "application/json",
          },
        });

        const jsonStr = response.text?.trim();
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          return res.json({ routine: parsed, generatedBy: "gemini-3.8-flash" });
        }
      } catch (err) {
        console.warn("Routine generation fallback triggered:", err);
      }
    }

    // Fallback routine
    return res.json({
      generatedBy: "template_fallback",
      routine: {
        routineName: `Rutina Personalizada GymBro - ${goal || "Fuerza y Salud"}`,
        focus: goal || "Hipertrofia y Acondicionamiento",
        days: [
          {
            dayName: "Lunes",
            title: "Pecho, Hombros y Tríceps (Empuje)",
            durationMin: 55,
            exercises: [
              { name: "Press de Banca Plano", muscleGroup: "Pecho", sets: 4, reps: "10-12", restSeconds: 90, targetWeightKg: 50, notes: "Bajar con control, pausa de 1 seg en el pecho." },
              { name: "Press Militar con Mancuernas", muscleGroup: "Hombros", sets: 3, reps: "12", restSeconds: 75, targetWeightKg: 16, notes: "Espalda bien apoyada en el banco inclinado." },
              { name: "Aperturas en Polea / Peck Deck", muscleGroup: "Pecho", sets: 3, reps: "15", restSeconds: 60, targetWeightKg: 25, notes: "Apretar 1 segundo en la contracción máxima." },
              { name: "Extensiones de Tríceps en Polea Alta", muscleGroup: "Tríceps", sets: 4, reps: "12-15", restSeconds: 60, targetWeightKg: 20, notes: "Codos pegados al cuerpo, rango completo." }
            ]
          },
          {
            dayName: "Miércoles",
            title: "Espalda, Bíceps y Core (Tracción)",
            durationMin: 55,
            exercises: [
              { name: "Jalón al Pecho en Polea", muscleGroup: "Espalda", sets: 4, reps: "10-12", restSeconds: 90, targetWeightKg: 45, notes: "Llevar la barra a la clavícula activando dorsales." },
              { name: "Remo con Mancuerna en Banco", muscleGroup: "Espalda", sets: 3, reps: "12 c/lado", restSeconds: 75, targetWeightKg: 20, notes: "Codo guiado hacia la cadera." },
              { name: "Curl de Bíceps con Barra Z", muscleGroup: "Bíceps", sets: 3, reps: "12", restSeconds: 60, targetWeightKg: 22, notes: "Sin balancear la zona lumbar." },
              { name: "Plancha Abdominal Isométrica", muscleGroup: "Core", sets: 3, reps: "45 seg", restSeconds: 45, targetWeightKg: 0, notes: "Glúteos y abdomen bien compactos." }
            ]
          },
          {
            dayName: "Viernes",
            title: "Piernas y Glúteos (Inferior Potente)",
            durationMin: 60,
            exercises: [
              { name: "Sentadilla en Barra o Prensa 45°", muscleGroup: "Piernas", sets: 4, reps: "10-12", restSeconds: 120, targetWeightKg: 70, notes: "Profundidad controlada y rodillas en línea con los pies." },
              { name: "Prensa de Piernas Inclinada", muscleGroup: "Cuádriceps", sets: 3, reps: "12-15", restSeconds: 90, targetWeightKg: 100, notes: "No bloquear rodillas arriba." },
              { name: "Curl Femoral Tumbado", muscleGroup: "Isquiosurales", sets: 3, reps: "12", restSeconds: 60, targetWeightKg: 30, notes: "Control en la fase excéntrica." },
              { name: "Elevación de Talones en Máquina", muscleGroup: "Gemelos", sets: 4, reps: "15-20", restSeconds: 45, targetWeightKg: 40, notes: "Máxima flexión y extensión del tobillo." }
            ]
          }
        ]
      }
    });
  } catch (error: any) {
    console.error("Error in /api/ai/routine:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[GymBro Server] Listening on http://${HOST}:${PORT}`);
  });
}

startServer();
