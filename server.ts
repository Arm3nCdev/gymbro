import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { GymDatabase, GymStore, SessionRow } from "./server/database";
import { PlatformDatabase, TenantInfo } from "./server/platform";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Behind nginx: take the client IP from X-Forwarded-For (used by the rate limits). In Docker
// nginx reaches the app through the bridge network, so TRUST_PROXY adds the private ranges.
app.set(
  "trust proxy",
  String(process.env.TRUST_PROXY || "loopback").split(",").map((s) => s.trim()).filter(Boolean)
);
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: "15mb" }));

// In-memory rate limit for login/registration: max `limit` hits per key within `windowMs`.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    if (rateBuckets.size > 10000) {
      for (const [k, b] of rateBuckets) if (b.resetAt < now) rateBuckets.delete(k);
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

const TOO_MANY_ATTEMPTS = "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
const SUSPENDED_MESSAGE = "El servicio de este gimnasio está suspendido. Consultá en recepción o con el soporte de GymBro.";

// Resolves the gym of every API call: /<slug>/api/... (rewritten to /api/... for the routes
// below) or the bare /api/... of earlier versions, which belongs to DEFAULT_TENANT. Everything
// the route handlers do then runs against that gym's database.
app.use((req, res, next) => {
  if (req.path === "/api/health") return next();
  let slug = "";
  const match = req.path.match(/^\/([^/]+)\/api(\/.*)?$/);
  if (match && isValidTenantSlug(match[1].toLowerCase())) {
    slug = match[1].toLowerCase();
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    req.url = `/api${match[2] || "/"}${query}`;
  } else if (req.path.startsWith("/api/")) {
    // A bare /api call comes from the single-gym version of the app still cached by a browser:
    // take the gym from the page that made the call (/<slug>/...), else DEFAULT_TENANT.
    let fromPage = "";
    try {
      const referer = new URL(String(req.headers.referer || ""));
      if (referer.host === req.headers.host) fromPage = (referer.pathname.split("/")[1] || "").toLowerCase();
    } catch {}
    slug = isValidTenantSlug(fromPage) && platform.getTenant(fromPage) ? fromPage : DEFAULT_TENANT;
  } else {
    return next();
  }
  const info = platform.getTenant(slug);
  if (!info) return res.status(404).json({ error: "Gimnasio no encontrado. Revisá el enlace." });
  if (info.status === "suspended") return res.status(423).json({ error: SUSPENDED_MESSAGE, suspended: true });
  tenantStorage.run(openTenant(slug), next);
});

// ---------------------------------------------------------------------------
// Multi-tenant storage: every gym (tenant) has its own SQLite file in
// DATA_DIR/tenants/<slug>/gym.db, so one gym's data can never leak into another's.
// Gyms are reached at /<slug>/ (pages) and /<slug>/api/... (API); the bare /api/... of
// earlier versions maps to DEFAULT_TENANT so existing links and installed apps keep working.
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || process.cwd();
fs.mkdirSync(DATA_DIR, { recursive: true });
const TENANTS_DIR = path.join(DATA_DIR, "tenants");
const DEFAULT_TENANT = String(process.env.DEFAULT_TENANT || "gymbro").toLowerCase();
const TENANT_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;
// Path segments that can never be a gym: they are app routes or static files.
const RESERVED_SLUGS = new Set([
  "api", "assets", "plataforma", "static", "admin", "www", "app", "sw.js", "registersw.js",
  "manifest.webmanifest", "favicon.ico", "icon.svg", "apple-touch-icon.png",
  // direct portal paths of the single-gym version
  "dueno", "owner", "coach", "entrenador", "profe", "trainer", "alumno", "student",
]);
// Those direct portal paths (/dueno, /coach, /alumno...) redirect to the same portal of DEFAULT_TENANT.
const LEGACY_PORTAL_PATHS: Record<string, string> = {
  dueno: "dueno", owner: "dueno", coach: "coach", entrenador: "coach", profe: "coach", trainer: "coach",
  alumno: "alumno", student: "alumno",
};

type ServerGymStore = GymStore;

interface TenantContext {
  slug: string;
  dir: string;
  database: GymDatabase;
  store: ServerGymStore | null;
  sessions: Record<string, SessionRow>;
  lastBackupAt: number;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();
const openTenants = new Map<string, TenantContext>();

// The gym of the current request (set by the tenant middleware).
function tenant(): TenantContext {
  const current = tenantStorage.getStore();
  if (!current) throw new Error("No gym selected for this request.");
  return current;
}

function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);
}

function openTenant(slug: string): TenantContext {
  let ctx = openTenants.get(slug);
  if (!ctx) {
    const dir = path.join(TENANTS_DIR, slug);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const database = new GymDatabase(path.join(dir, "gym.db"));
    ctx = { slug, dir, database, store: null, sessions: database.loadSessions(), lastBackupAt: 0 };
    openTenants.set(slug, ctx);
  }
  return ctx;
}

function withTenant<T>(slug: string, fn: () => T): T {
  return tenantStorage.run(openTenant(slug), fn);
}

const platform = new PlatformDatabase(path.join(DATA_DIR, "platform.db"));

const DEFAULT_SERVER_SETTINGS = {
  gymName: process.env.GYM_NAME || "GymBro Fitness Center",
  tagline: "Fuerza, Salud y Rendimiento",
  phone: "+595 981 123456",
  address: "Av. Mariscal López 1250, Asunción, Paraguay",
  currencySymbol: "₲",
  monthlyDefaultPrice: 180000,
  ownerName: "Administrador",
  supportEmail: "administracion@gymbro.app",
};

// ---------------------------------------------------------------------------
// Passwords: stored as scrypt hashes ("scrypt$<salt>$<hash>"). Plain-text passwords from
// older databases are still accepted once and re-hashed when the store loads.
// ---------------------------------------------------------------------------

const MIN_PASSWORD_LENGTH = 6;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function isHashedPassword(stored: unknown): boolean {
  return typeof stored === "string" && stored.startsWith("scrypt$");
}

function verifyPassword(password: string, stored: unknown): boolean {
  if (typeof stored !== "string" || !stored) return false;
  if (!isHashedPassword(stored)) {
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function passwordError(password: string): string | null {
  return password.length < MIN_PASSWORD_LENGTH
    ? `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    : null;
}

// Owner accounts are seeded from the environment (OWNER_USERNAME / OWNER_PASSWORD / OWNER_NAME,
// plus any extra owners listed in OWNER_ACCOUNTS).
// Outside production it falls back to the demo account (admin / admin123); in production
// OWNER_PASSWORD is required and existing owners are left as they are when it is missing.
function buildInitialOwners(): any[] {
  if (!process.env.OWNER_PASSWORD && process.env.NODE_ENV === "production") return [];
  const password = String(process.env.OWNER_PASSWORD || "admin123").trim();
  if (!process.env.OWNER_PASSWORD) {
    console.warn("[GymBro Server] OWNER_PASSWORD is not set: using the demo owner password (admin123).");
  }
  const username = String(process.env.OWNER_USERNAME || "admin").trim().toLowerCase();
  const name = String(process.env.OWNER_NAME || "Administrador").trim();
  const owners = [buildOwner(username, password, name)];

  // Extra owners: OWNER_ACCOUNTS="usuario:contraseña:Nombre;usuario2:contraseña2:Nombre 2"
  for (const entry of String(process.env.OWNER_ACCOUNTS || "").split(";")) {
    const [extraUsername, extraPassword, ...nameParts] = entry.split(":").map((part) => part.trim());
    if (!extraUsername || !extraPassword) continue;
    const cleanUsername = extraUsername.toLowerCase();
    if (owners.some((owner) => owner.username === cleanUsername)) continue;
    owners.push(buildOwner(cleanUsername, extraPassword, nameParts.join(":") || extraUsername));
  }
  return owners;
}

function buildOwner(username: string, password: string, name: string): any {
  return {
    id: `usr_owner_${username}`,
    username,
    password, // plain here; hashed by withConfiguredOwner before it is stored
    name,
    role: "owner",
    email: `${username}@gymbro.app`,
  };
}

const CONFIGURED_OWNERS: any[] = buildInitialOwners();

// Make sure the configured owner can always log in, even on a database created
// before the owner credentials changed (adds it, or resets its password), and hash
// every password that is still stored in plain text.
// The OWNER_* environment only applies to DEFAULT_TENANT (the original single-gym install);
// owners of other gyms are created from the platform panel.
function withConfiguredOwner(users: any[]): any[] {
  const result = users.map((u: any) =>
    u && typeof u.password === "string" && u.password && !isHashedPassword(u.password)
      ? { ...u, password: hashPassword(u.password) }
      : u
  );
  for (const owner of tenant().slug === DEFAULT_TENANT ? CONFIGURED_OWNERS : []) {
    const index = result.findIndex((u: any) => String(u.username || "").toLowerCase() === owner.username);
    if (index === -1) {
      result.push({ ...owner, password: hashPassword(owner.password) });
    } else if (!verifyPassword(owner.password, result[index].password) || result[index].role !== "owner") {
      result[index] = { ...result[index], password: hashPassword(owner.password), role: "owner" };
      revokeUserSessions(result[index].id);
    }
  }
  return result;
}

// Never send stored passwords back to any client.
function stripPasswords(users: any[]): any[] {
  return users.map(({ password: _password, ...rest }: any) => rest);
}

const DEFAULT_INITIAL_MEMBERS: any[] = [];

// Reads a pre-SQLite gym_database.json once, for the import into SQLite. An existing file
// that can't be parsed stops the server: it must never be replaced by an empty database.
function readLegacyStore(file: string): any | null {
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (!parsed || typeof parsed !== "object") throw new Error("contenido inválido");
    return parsed;
  } catch (err) {
    console.error(`[GymBro Server] ${file} is unreadable; fix or remove it before starting.`, err);
    process.exit(1);
  }
}

function loadServerGymStore(): ServerGymStore {
  const t = tenant();
  if (t.store) return t.store;

  const legacyData = path.join(t.dir, "gym_database.json");
  const legacySessions = path.join(t.dir, "gym_sessions.json");
  let source: any;
  let imported = false;
  if (t.database.isEmpty()) {
    source = readLegacyStore(legacyData);
    imported = !!source;
    if (imported) console.log(`[GymBro Server] ${t.slug}: importing gym_database.json into SQLite.`);
  }
  if (!source) source = t.database.load();

  const users = Array.isArray(source.users) ? source.users : [];
  t.store = {
    members: Array.isArray(source.members) ? source.members : DEFAULT_INITIAL_MEMBERS,
    users: withConfiguredOwner(users),
    settings: { ...DEFAULT_SERVER_SETTINGS, ...(source.settings || {}) },
    lastUpdated: source.lastUpdated || Date.now(),
  };
  saveServerGymStore(t.store);
  if (imported) {
    importLegacySessions(legacySessions);
    const stamp = Date.now();
    for (const file of [legacyData, legacySessions]) {
      if (fs.existsSync(file)) fs.renameSync(file, `${file}.migrated-${stamp}`);
    }
  }
  return t.store;
}

// Hourly snapshots of each gym's database in its backups/ folder (the last BACKUPS_TO_KEEP are kept).
const BACKUP_INTERVAL_MS = 60 * 60 * 1000;
const BACKUPS_TO_KEEP = 72;

function backupDatabaseIfDue(): void {
  const t = tenant();
  if (Date.now() - t.lastBackupAt < BACKUP_INTERVAL_MS) return;
  try {
    const backupsDir = path.join(t.dir, "backups");
    fs.mkdirSync(backupsDir, { recursive: true, mode: 0o700 });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupsDir, `gym.${stamp}.db`);
    t.database.backupTo(backupPath);
    fs.chmodSync(backupPath, 0o600);
    t.lastBackupAt = Date.now();
    const old = fs.readdirSync(backupsDir).filter((f) => /^gym\..*\.db$/.test(f)).sort().slice(0, -BACKUPS_TO_KEEP);
    for (const file of old) fs.unlinkSync(path.join(backupsDir, file));
  } catch (err) {
    console.error(`Error creating database backup (${t.slug}):`, err);
  }
}

function saveServerGymStore(store: ServerGymStore): void {
  const t = tenant();
  try {
    t.store = store;
    t.database.save(store);
    backupDatabaseIfDue();
  } catch (err) {
    console.error(`Error saving the gym database (${t.slug}):`, err);
  }
}

// ---------------------------------------------------------------------------
// Sessions & role-based access (per gym: a token only works in the gym that issued it)
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function importLegacySessions(file: string): void {
  const t = tenant();
  try {
    if (!fs.existsSync(file)) return;
    const legacy = JSON.parse(fs.readFileSync(file, "utf-8")) || {};
    for (const [token, s] of Object.entries<any>(legacy)) {
      if (s && s.userId && Number(s.expiresAt) > Date.now()) {
        t.database.putSession(token, { userId: s.userId, expiresAt: Number(s.expiresAt) });
      }
    }
    t.sessions = t.database.loadSessions();
  } catch (err) {
    console.error("Error importing gym_sessions.json, starting without sessions:", err);
  }
}

function deleteSession(token: string): void {
  const t = tenant();
  delete t.sessions[token];
  t.database.deleteSession(token);
}

// Logs a user out everywhere (used when their password changes).
function revokeUserSessions(userId: string): void {
  const t = tenant();
  for (const [token, s] of Object.entries(t.sessions)) {
    if (s.userId === userId) delete t.sessions[token];
  }
  t.database.deleteUserSessions(userId);
}

function getRequestToken(req: express.Request): string {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function createSession(userId: string): string {
  const t = tenant();
  const token = crypto.randomBytes(32).toString("hex");
  t.sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
  t.database.putSession(token, t.sessions[token]);
  return token;
}

function getRequestUser(req: express.Request): any | null {
  const sessions = tenant().sessions;
  const token = getRequestToken(req);
  const session = token && Object.prototype.hasOwnProperty.call(sessions, token) ? sessions[token] : undefined;
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

// The gym's logo is a small image data URL stored in its settings (resized in the browser).
const MAX_LOGO_LENGTH = 400_000;
function isValidLogo(logo: unknown): boolean {
  return (
    typeof logo === "string" &&
    logo.length <= MAX_LOGO_LENGTH &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)
  );
}

// Public branding of the gym (name and logo) for its login screen.
app.get("/api/branding", (_req, res) => {
  const settings = loadServerGymStore().settings || {};
  res.json({
    gymName: settings.gymName || "GymBro",
    tagline: settings.tagline || "",
    logoUrl: isValidLogo(settings.logoUrl) ? settings.logoUrl : undefined,
  });
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
      if (isOwner && members.length === 0 && store.members.length > 0) {
        // An empty list from a browser with cleared/stale data would wipe every member: refuse it.
        console.warn(`[GymBro Server] Ignored a sync from ${user.username} that would delete all ${store.members.length} members.`);
      } else if (isOwner) {
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
      const next = { ...store.settings, ...settings };
      if (!isValidLogo(next.logoUrl)) delete next.logoUrl;
      store.settings = next;
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

// API: Self-registration — students only (QR at the gym). Trainer accounts are created by the
// owner (/api/users/direct-create) and owner accounts come from the server environment.
app.post("/api/users/register", (req, res) => {
  try {
    const { username, password, name, role, email, phone, member } = req.body;
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();
    const cleanName = String(name || "").trim().slice(0, 80);

    if (rateLimited(`register|${tenant().slug}|${req.ip}`, 10, 60 * 60 * 1000)) {
      return res.status(429).json({ error: TOO_MANY_ATTEMPTS });
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({ error: "El usuario debe tener entre 3 y 30 letras, números, punto, guion o guion bajo." });
    }
    const pwError = passwordError(cleanPassword);
    if (pwError) return res.status(400).json({ error: pwError });
    if (!cleanName) return res.status(400).json({ error: "El nombre es obligatorio." });
    if (role !== "student") {
      return res.status(403).json({
        error: role === "trainer"
          ? "Las cuentas de profesor las crea el dueño del gimnasio desde su portal."
          : "Las cuentas de Dueño / Administración no se crean desde la web.",
      });
    }

    const store = loadServerGymStore();
    const exists = store.users.find(
      (u: any) => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername)
    );
    if (exists) {
      return res.status(400).json({ error: "Este nombre de usuario ya está registrado." });
    }

    const userId = `usr_student_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    // The member id is always generated here: accepting one from the client would let a new
    // account attach itself to another student's existing record.
    const memberId = `mem_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const cleanEmail = String(email || "").trim().slice(0, 120);
    const cleanPhone = String(phone || "").trim().slice(0, 40);
    const requestedMethod = member?.paymentMethod === "transferencia" ? "transferencia" : "efectivo";
    const requestedGoal = String(member?.goal || "").trim().slice(0, 200);

    {
      // A self-registered student always starts unpaid, on the gym's default plan.
      const newMemberObj = {
        id: memberId,
        name: cleanName,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
        email: cleanEmail || `${cleanUsername}@gymbro.app`,
        phone: cleanPhone || "+595 981 000000",
        memberSince: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
        planName: "Pase Libre Total Musculación",
        planPrice: store.settings.monthlyDefaultPrice || 180000,
        paymentMethod: requestedMethod,
        paymentStatus: "pendiente",
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        daysAbsent: 0,
        streakDays: 0,
        lastAttended: "Recién registrado",
        goal: requestedGoal || "Fuerza, salud y acondicionamiento físico",
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
      password: hashPassword(cleanPassword),
      name: cleanName,
      role: "student",
      memberId,
      email: cleanEmail || `${cleanUsername}@gymbro.app`,
      phone: cleanPhone || undefined,
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
    if (
      rateLimited(`login|${tenant().slug}|${req.ip}|${cleanUsername}`, 10, 15 * 60 * 1000) ||
      rateLimited(`login|${req.ip}`, 40, 15 * 60 * 1000)
    ) {
      return res.status(429).json({ error: TOO_MANY_ATTEMPTS });
    }

    const store = loadServerGymStore();
    const user = store.users.find(
      (u: any) =>
        (String(u.username || "").toLowerCase() === cleanUsername ||
          (u.email && String(u.email).toLowerCase() === cleanUsername)) &&
        verifyPassword(cleanPassword, u.password)
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

// API: Logout — revokes the session token on the server.
app.post("/api/users/logout", (req, res) => {
  const token = getRequestToken(req);
  if (token && Object.prototype.hasOwnProperty.call(tenant().sessions, token)) deleteSession(token);
  res.json({ success: true });
});

// API: Password reset — only the owner can set a new password for a trainer or student
// (there is no self-service recovery: anyone who knew a name or phone could take over an account).
app.post("/api/users/reset-password", requireRole("owner"), (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const cleanPass = String(newPassword || "").trim();
    const pwError = passwordError(cleanPass);
    if (pwError) return res.status(400).json({ error: pwError });

    const store = loadServerGymStore();
    const target = store.users.find((u: any) => u.id === userId);
    if (!target) return res.status(404).json({ error: "No se encontró la cuenta." });
    if (target.role === "owner") {
      return res.status(403).json({ error: "La clave de Dueño / Administración se cambia en el servidor (OWNER_PASSWORD)." });
    }

    target.password = hashPassword(cleanPass);
    revokeUserSessions(target.id);
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({ success: true, message: `Contraseña de ${target.name} actualizada.`, user: publicUser(target) });
  } catch (err: any) {
    console.error("Error in /api/users/reset-password:", err);
    res.status(500).json({ error: "Error al restablecer la contraseña." });
  }
});

// Creates an account in the current gym (and its member record for students).
// Throws an Error with a user-facing message when the data is invalid.
function createGymUser(data: any, allowedRoles: string[]): { user: any; member?: any } {
  const { username, password, name, role, email, phone, specialty, planPrice } = data || {};
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "").trim();
  const cleanName = String(name || "").trim().slice(0, 80);

  if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
    throw new Error("El usuario debe tener entre 3 y 30 letras, números, punto, guion o guion bajo.");
  }
  const pwError = passwordError(cleanPassword);
  if (pwError) throw new Error(pwError);
  if (!cleanName) throw new Error("Nombre obligatorio.");
  if (!allowedRoles.includes(role)) throw new Error("Rol no permitido.");

  const store = loadServerGymStore();
  if (store.users.some((u: any) => String(u.username || "").toLowerCase() === cleanUsername)) {
    throw new Error("Este nombre de usuario ya existe.");
  }

  const suffix = `${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  let member: any;
  if (role === "student") {
    const memberId = `mem_${suffix}`;
    member = {
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
    store.members.unshift(member);
  }

  const user = {
    id: `usr_${role}_${suffix}`,
    username: cleanUsername,
    password: hashPassword(cleanPassword),
    name: cleanName,
    role,
    memberId: member?.id,
    email: email || `${cleanUsername}@gymbro.app`,
    phone: phone || undefined,
    specialty: specialty || undefined,
  };
  store.users.push(user);
  store.lastUpdated = Date.now();
  saveServerGymStore(store);
  return { user: publicUser(user), member };
}

// API: Direct creation of trainer or student by owner
app.post("/api/users/direct-create", requireRole("owner"), (req, res) => {
  try {
    const { user, member } = createGymUser(req.body, ["trainer", "student"]);
    const store = loadServerGymStore();
    res.json({ success: true, user, member, members: store.members, users: stripPasswords(store.users) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Error al crear el usuario." });
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

// Wiping the database is not exposed over HTTP: one click in a browser could erase a live gym.
// To hand an install over clean, stop the service and delete gym.db on the server.

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

// ---------------------------------------------------------------------------
// Platform administration (/plataforma): the GymBro operator creates gyms and their owners,
// trainers and students, suspends/resumes gyms and resets passwords. The administrator is
// stored in platform.db; the first one is created from the panel with PLATFORM_SETUP_CODE
// (a one-time code from the server's environment), so nobody else can claim a fresh install.
// ---------------------------------------------------------------------------

const PLATFORM_SETUP_CODE = String(process.env.PLATFORM_SETUP_CODE || "").trim();
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_MIN_PASSWORD = 8;

function generatePassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

function requirePlatformAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getRequestToken(req);
  const admin = token ? platform.adminForSession(token) : undefined;
  if (!admin) return res.status(401).json({ error: "Sesión de plataforma expirada. Volvé a ingresar." });
  res.locals.admin = admin;
  next();
}

function startAdminSession(username: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  platform.putAdminSession(token, username, Date.now() + ADMIN_SESSION_TTL_MS);
  return token;
}

function sameSecret(a: string, b: string): boolean {
  return crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(), crypto.createHash("sha256").update(b).digest());
}

function tenantSummary(info: TenantInfo) {
  return withTenant(info.slug, () => {
    const store = loadServerGymStore();
    const count = (role: string) => store.users.filter((u: any) => u.role === role).length;
    const owner = store.users.find((u: any) => u.role === "owner");
    let sizeBytes = 0;
    for (const f of ["gym.db", "gym.db-wal"]) {
      try { sizeBytes += fs.statSync(path.join(tenant().dir, f)).size; } catch {}
    }
    return {
      ...info,
      gymName: store.settings?.gymName || info.name,
      logoUrl: isValidLogo(store.settings?.logoUrl) ? store.settings.logoUrl : undefined,
      owner: owner ? { username: owner.username, name: owner.name } : null,
      owners: count("owner"),
      trainers: count("trainer"),
      students: count("student"),
      members: store.members.length,
      membersUpToDate: store.members.filter((m: any) => m.paymentStatus === "al_dia").length,
      lastUpdated: store.lastUpdated,
      sizeBytes,
      path: `/${info.slug}/`,
    };
  });
}

// Creates the gym's database with its owner account and returns the owner's first password.
function createTenant(slug: string, name: string, ownerUsername: string, ownerName: string, ownerPassword?: string): { password: string } {
  const password = ownerPassword || generatePassword();
  platform.addTenant({ slug, name, status: "active", createdAt: Date.now() });
  withTenant(slug, () => {
    const t = tenant();
    if (!t.database.isEmpty()) throw new Error(`La carpeta del gimnasio ${slug} ya tiene datos.`);
    t.store = {
      members: [],
      users: [{
        id: `usr_owner_${ownerUsername}`,
        username: ownerUsername,
        password: hashPassword(password),
        name: ownerName,
        role: "owner",
        email: `${ownerUsername}@gymbro.app`,
      }],
      settings: { ...DEFAULT_SERVER_SETTINGS, gymName: name, ownerName },
      lastUpdated: Date.now(),
    };
    saveServerGymStore(t.store);
  });
  return { password };
}

app.get("/plataforma/api/setup", (_req, res) => {
  res.json({ needsSetup: !platform.hasAdmin(), codeRequired: !!PLATFORM_SETUP_CODE || process.env.NODE_ENV === "production" });
});

// First administrator: only while there is none, and only with the server's one-time setup code.
app.post("/plataforma/api/setup", (req, res) => {
  if (rateLimited(`platform-setup|${req.ip}`, 10, 15 * 60 * 1000)) return res.status(429).json({ error: TOO_MANY_ATTEMPTS });
  if (platform.hasAdmin()) return res.status(409).json({ error: "El administrador ya fue creado. Ingresá con tu usuario." });
  const code = String(req.body?.code || "").trim();
  if (PLATFORM_SETUP_CODE ? !sameSecret(code, PLATFORM_SETUP_CODE) : process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Código de instalación incorrecto." });
  }
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return res.status(400).json({ error: "El usuario debe tener entre 3 y 30 letras, números, punto, guion o guion bajo." });
  }
  if (password.length < ADMIN_MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña del administrador debe tener al menos ${ADMIN_MIN_PASSWORD} caracteres.` });
  }
  platform.addAdmin(username, hashPassword(password));
  console.log(`[GymBro Server] Platform administrator created: ${username}`);
  res.json({ success: true, token: startAdminSession(username), username });
});

app.post("/plataforma/api/login", (req, res) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();
  if (rateLimited(`platform-login|${req.ip}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: TOO_MANY_ATTEMPTS });
  }
  const stored = platform.getAdminPassword(username);
  // Hash anyway when the user doesn't exist, so timing doesn't reveal valid usernames.
  const ok = verifyPassword(password, stored || hashPassword("not-a-user"));
  if (!stored || !ok) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  res.json({ success: true, token: startAdminSession(username), username });
});

app.post("/plataforma/api/password", requirePlatformAdmin, (req, res) => {
  const admin = res.locals.admin as string;
  const current = String(req.body?.current || "").trim();
  const next = String(req.body?.password || "").trim();
  if (!verifyPassword(current, platform.getAdminPassword(admin))) {
    return res.status(403).json({ error: "La contraseña actual no es correcta." });
  }
  if (next.length < ADMIN_MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña nueva debe tener al menos ${ADMIN_MIN_PASSWORD} caracteres.` });
  }
  platform.setAdminPassword(admin, hashPassword(next));
  platform.deleteAdminSessionsOf(admin);
  res.json({ success: true, token: startAdminSession(admin) });
});

app.post("/plataforma/api/logout", (req, res) => {
  const token = getRequestToken(req);
  if (token) platform.deleteAdminSession(token);
  res.json({ success: true });
});

app.get("/plataforma/api/tenants", requirePlatformAdmin, (_req, res) => {
  res.json({ tenants: platform.listTenants().map(tenantSummary) });
});

app.post("/plataforma/api/tenants", requirePlatformAdmin, (req, res) => {
  try {
    const slug = String(req.body?.slug || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim().slice(0, 80);
    const ownerUsername = String(req.body?.ownerUsername || "admin").trim().toLowerCase();
    const ownerName = String(req.body?.ownerName || "Administrador").trim().slice(0, 80) || "Administrador";
    const ownerPassword = String(req.body?.ownerPassword || "").trim();
    if (ownerPassword) {
      const pwError = passwordError(ownerPassword);
      if (pwError) return res.status(400).json({ error: pwError });
    }
    if (!isValidTenantSlug(slug)) {
      return res.status(400).json({ error: "El identificador debe tener de 2 a 31 letras minúsculas, números o guiones, y no puede ser una palabra reservada." });
    }
    if (platform.getTenant(slug)) return res.status(409).json({ error: `Ya existe un gimnasio con el identificador "${slug}".` });
    if (!name) return res.status(400).json({ error: "El nombre del gimnasio es obligatorio." });
    if (!/^[a-z0-9._-]{3,30}$/.test(ownerUsername)) {
      return res.status(400).json({ error: "El usuario del dueño debe tener entre 3 y 30 letras, números, punto, guion o guion bajo." });
    }
    const { password } = createTenant(slug, name, ownerUsername, ownerName, ownerPassword || undefined);
    console.log(`[GymBro Server] Gym created: ${slug} (${name})`);
    res.json({
      success: true,
      tenant: tenantSummary(platform.getTenant(slug)!),
      owner: { username: ownerUsername, password },
    });
  } catch (err: any) {
    console.error("Error creating gym:", err);
    res.status(500).json({ error: err?.message || "No se pudo crear el gimnasio." });
  }
});

app.post("/plataforma/api/tenants/:slug/status", requirePlatformAdmin, (req, res) => {
  const status = req.body?.status === "suspended" ? "suspended" : "active";
  const updated = platform.updateTenant(String(req.params.slug), { status });
  if (!updated) return res.status(404).json({ error: "Gimnasio no encontrado." });
  console.log(`[GymBro Server] Gym ${updated.slug} is now ${status}`);
  res.json({ success: true, tenant: tenantSummary(updated) });
});

function requireTenantParam(req: express.Request, res: express.Response): TenantInfo | null {
  const info = platform.getTenant(String(req.params.slug));
  if (!info) {
    res.status(404).json({ error: "Gimnasio no encontrado." });
    return null;
  }
  return info;
}

app.get("/plataforma/api/tenants/:slug/users", requirePlatformAdmin, (req, res) => {
  const info = requireTenantParam(req, res);
  if (!info) return;
  const users = withTenant(info.slug, () =>
    loadServerGymStore().users.map((u: any) => ({
      id: u.id, username: u.username, name: u.name, role: u.role, email: u.email, phone: u.phone, specialty: u.specialty,
    }))
  );
  res.json({ users });
});

// Creates an owner, trainer or student in a gym (the admin chooses the password).
app.post("/plataforma/api/tenants/:slug/users", requirePlatformAdmin, (req, res) => {
  const info = requireTenantParam(req, res);
  if (!info) return;
  try {
    const { user } = withTenant(info.slug, () => createGymUser(req.body, ["owner", "trainer", "student"]));
    console.log(`[GymBro Server] ${info.slug}: ${user.role} ${user.username} created from the platform panel`);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "No se pudo crear el usuario." });
  }
});

// Sets a new password for any account of a gym (given, or generated when empty); its sessions end.
app.post("/plataforma/api/tenants/:slug/users/:id/password", requirePlatformAdmin, (req, res) => {
  const info = requireTenantParam(req, res);
  if (!info) return;
  const given = String(req.body?.password || "").trim();
  if (given) {
    const pwError = passwordError(given);
    if (pwError) return res.status(400).json({ error: pwError });
  }
  const result = withTenant(info.slug, () => {
    const store = loadServerGymStore();
    const user = store.users.find((u: any) => u.id === req.params.id);
    if (!user) return null;
    const password = given || generatePassword();
    user.password = hashPassword(password);
    revokeUserSessions(user.id);
    store.lastUpdated = Date.now();
    saveServerGymStore(store);
    return { username: user.username, password };
  });
  if (!result) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------------------
// Pages: /<slug>/ serves the app for that gym, /plataforma/ the platform panel.
// ---------------------------------------------------------------------------

const NOT_FOUND_PAGE = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gimnasio no encontrado</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:16px}
.c{max-width:420px;text-align:center;background:#171717;border:1px solid #262626;border-radius:24px;padding:32px 24px}h1{font-size:20px;color:#fff;margin:0 0 8px}p{color:#a3a3a3;font-size:14px;line-height:1.5;margin:0}</style></head>
<body><div class="c"><h1>Gimnasio no encontrado</h1><p>Revisá el enlace que te pasó tu gimnasio: tiene la forma <strong>gymbro.local.net.py/nombre-del-gimnasio/</strong>.</p></div></body></html>`;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function servePages(distPath: string) {
  const indexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
  const manifestPath = path.join(distPath, "manifest.webmanifest");
  const baseManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
  const suspendedPath = path.join(distPath, "suspendido.html");
  const noStore = (res: express.Response) => res.setHeader("Cache-Control", "no-cache");

  app.get("/", (_req, res) => {
    res.redirect(302, platform.getTenant(DEFAULT_TENANT) ? `/${DEFAULT_TENANT}/` : "/plataforma/");
  });
  app.get(["/plataforma", "/plataforma/*"], (_req, res) => {
    noStore(res);
    res.type("html").send(indexHtml);
  });

  const gymName = (slug: string) =>
    withTenant(slug, () => String(loadServerGymStore().settings?.gymName || platform.getTenant(slug)?.name || "GymBro"));

  // Each gym installs as its own app (name and start page of that gym).
  app.get("/:slug/manifest.webmanifest", (req, res, next) => {
    const slug = String(req.params.slug).toLowerCase();
    const info = isValidTenantSlug(slug) ? platform.getTenant(slug) : undefined;
    if (!info) return next();
    const name = gymName(slug);
    noStore(res);
    res.type("application/manifest+json").send(JSON.stringify({
      ...baseManifest, id: `/${slug}/`, name, short_name: name.slice(0, 12), start_url: `/${slug}/`, scope: `/${slug}/`,
    }));
  });

  app.get("/:legacy", (req, res, next) => {
    const portal = LEGACY_PORTAL_PATHS[String(req.params.legacy).toLowerCase()];
    if (!portal) return next();
    res.redirect(302, `/${DEFAULT_TENANT}/#/${portal}`);
  });

  app.get("/:slug", (req, res, next) => {
    const slug = String(req.params.slug).toLowerCase();
    // Express matches "/fitzone/" here too (non-strict routing): only add the missing slash.
    if (req.path.endsWith("/") || !isValidTenantSlug(slug)) return next();
    res.redirect(301, `/${slug}/`);
  });

  app.get("/:slug/*", (req, res, next) => {
    const slug = String(req.params.slug).toLowerCase();
    if (!isValidTenantSlug(slug)) return next();
    const info = platform.getTenant(slug);
    noStore(res);
    if (!info) return res.status(404).type("html").send(NOT_FOUND_PAGE);
    if (info.status === "suspended") return res.status(503).sendFile(suspendedPath);
    const html = indexHtml
      .replace('href="/manifest.webmanifest"', `href="/${slug}/manifest.webmanifest"`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(gymName(slug))}</title>`);
    res.type("html").send(html);
  });

  app.use((_req, res) => res.status(404).type("html").send(NOT_FOUND_PAGE));
}

// The single-gym layout of earlier versions (DATA_DIR/gym.db or gym_database.json) becomes the
// DEFAULT_TENANT gym: its files move into DATA_DIR/tenants/<DEFAULT_TENANT>/ untouched.
function migrateSingleGymLayout(): void {
  const legacy = fs.readdirSync(DATA_DIR).filter((f) => /^(gym\.db(-wal|-shm)?|gym_database\.json.*|gym_sessions\.json.*|backups)$/.test(f));
  if (legacy.length === 0) return;
  if (platform.getTenant(DEFAULT_TENANT)) {
    console.warn(`[GymBro Server] Found single-gym files in ${DATA_DIR} but "${DEFAULT_TENANT}" already exists; left them as they are.`);
    return;
  }
  const dir = path.join(TENANTS_DIR, DEFAULT_TENANT);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const file of legacy) {
    if (fs.existsSync(path.join(dir, file))) {
      console.error(`[GymBro Server] ${path.join(dir, file)} already exists; migration aborted to avoid overwriting data.`);
      process.exit(1);
    }
  }
  for (const file of legacy) fs.renameSync(path.join(DATA_DIR, file), path.join(dir, file));
  platform.addTenant({ slug: DEFAULT_TENANT, name: "GymBro", status: "active", createdAt: Date.now() });
  const name = withTenant(DEFAULT_TENANT, () => String(loadServerGymStore().settings?.gymName || "GymBro"));
  platform.updateTenant(DEFAULT_TENANT, { name });
  console.log(`[GymBro Server] Single-gym data moved to tenants/${DEFAULT_TENANT} (${name}).`);
}

// Vite & Static file serving
async function startServer() {
  migrateSingleGymLayout();
  // A fresh development install gets the default gym with the demo owner (admin / admin123).
  if (platform.listTenants().length === 0 && process.env.NODE_ENV !== "production") {
    platform.addTenant({ slug: DEFAULT_TENANT, name: DEFAULT_SERVER_SETTINGS.gymName, status: "active", createdAt: Date.now() });
  }
  // Open (and, the first time, import) every gym's database before accepting requests.
  for (const info of platform.listTenants()) withTenant(info.slug, () => loadServerGymStore());
  if (!platform.hasAdmin()) {
    console.warn(
      PLATFORM_SETUP_CODE || process.env.NODE_ENV !== "production"
        ? "[GymBro Server] No platform administrator yet: create it at /plataforma/ (setup code required in production)."
        : "[GymBro Server] No platform administrator and no PLATFORM_SETUP_CODE: the /plataforma panel can't be set up."
    );
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      // In Docker the HMR socket (24678 inside) is published on another host port: HMR_CLIENT_PORT tells the browser which.
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === "true" ? false : { port: 24678, clientPort: Number(process.env.HMR_CLIENT_PORT) || 24678 } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    servePages(distPath);
  }

  app.listen(PORT, HOST, () => {
    console.log(`[GymBro Server] Listening on http://${HOST}:${PORT} (${platform.listTenants().length} gym(s))`);
  });
}

startServer();
