import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Server-side persistent storage for multi-device sync
const DATA_FILE_PATH = path.join(process.cwd(), "gym_database.json");

interface ServerGymStore {
  members: any[];
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
  ownerName: "Prof. Lucas Morales",
  supportEmail: "administracion@gymbro.app",
};

const DEFAULT_INITIAL_MEMBERS = [
  {
    id: "mem_1",
    name: "Lucas Rossi",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    email: "lucas.rossi@email.com",
    phone: "+595 981 482199",
    memberSince: "15 Mar 2026",
    planName: "Pase Libre Total Musculación",
    planPrice: 180000,
    paymentMethod: "transferencia",
    paymentStatus: "al_dia",
    nextDueDate: "2026-09-28",
    daysAbsent: 0,
    streakDays: 14,
    lastAttended: "Hoy (08:30 hs)",
    goal: "Aumento de masa muscular (Hipertrofia) y fuerza",
    injuriesNotes: "Molestia leve en hombro izquierdo con cargas máximas en press militar.",
    todayMood: "energia",
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: "pay_101",
        date: "2026-08-28",
        amount: 180000,
        method: "transferencia",
        period: "Septiembre 2026",
        receiptNote: "Comprobante #9412 - Transferencia Bancaria",
        verified: true
      },
      {
        id: "pay_102",
        date: "2026-07-28",
        amount: 160000,
        method: "transferencia",
        period: "Agosto 2026",
        receiptNote: "Comprobante #8120 - Transferencia SIPAP",
        verified: true
      }
    ],
    routines: [
      {
        id: "rout_1",
        dayOfWeek: "Lunes",
        title: "Pecho, Hombro y Tríceps (Empuje Pesado)",
        durationMin: 55,
        completedToday: false,
        exercises: [
          {
            id: "ex_1",
            name: "Press de Banca Plano con Barra",
            muscleGroup: "Pecho",
            sets: 4,
            reps: "8-10",
            targetWeightKg: 75,
            restSeconds: 90,
            notes: "Buena retracción escapular, baja controlado en 3 segundos.",
            completedSets: [false, false, false, false]
          },
          {
            id: "ex_2",
            name: "Press Inclinado con Mancuernas",
            muscleGroup: "Pecho",
            sets: 4,
            reps: "10-12",
            targetWeightKg: 24,
            restSeconds: 75,
            notes: "Banco a 30 grados, estirar bien abajo.",
            completedSets: [false, false, false, false]
          },
          {
            id: "ex_3",
            name: "Elevaciones Laterales con Mancuerna",
            muscleGroup: "Hombros",
            sets: 4,
            reps: "15",
            targetWeightKg: 12,
            restSeconds: 60,
            notes: "Sin encoger los hombros ni impulsarse.",
            completedSets: [false, false, false, false]
          },
          {
            id: "ex_4",
            name: "Extensión de Tríceps en Polea Alta",
            muscleGroup: "Tríceps",
            sets: 4,
            reps: "12-15",
            targetWeightKg: 25,
            restSeconds: 60,
            notes: "Codos pegados a los costados del torso.",
            completedSets: [false, false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: "w_1", date: "2026-07-01", weightKg: 78.4, note: "Inicio de volumen limpio" },
      { id: "w_2", date: "2026-07-22", weightKg: 79.2, note: "Buena ganancia de fuerza" },
      { id: "w_3", date: "2026-08-15", weightKg: 80.1, note: "Comiendo con superávit calórico" },
      { id: "w_4", date: "2026-09-02", weightKg: 80.8, note: "Control en balanza semanal" },
      { id: "w_5", date: "2026-09-09", weightKg: 81.3, note: "Récord personal en sentadilla" }
    ],
    photos: [
      {
        id: "p_1",
        date: "2026-07-05",
        imageUrl: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80",
        tag: "Frente",
        weightKg: 78.4,
        note: "Foto inicial al empezar el plan de volumen con GymBro"
      },
      {
        id: "p_2",
        date: "2026-09-05",
        imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80",
        tag: "Frente",
        weightKg: 81.0,
        note: "Progreso luego de 2 meses: hombros y pecho con mucho más relieve"
      }
    ],
    messages: [
      {
        id: "msg_1",
        type: "workout_reminder",
        title: "¡Hoy toca Empuje Pesado! 🔥",
        content: "¡Buenas Lucas! Recordá que hoy tenés press plano y hombros. Meté una buena entrada en calor para cuidar ese hombro izquierdo.",
        date: "Hoy 07:00 hs",
        sender: "Coach GymBro",
        read: false
      },
      {
        id: "msg_2",
        type: "payment_reminder",
        title: "Pago registrado con éxito 📲",
        content: "Muchas gracias Lucas. Recibimos tu transferencia bancaria de ₲ 180.000. Tu cuota queda cubierta hasta el 28 de Septiembre.",
        date: "28 Ago 2026",
        sender: "Gimnasio GymBro",
        read: true
      }
    ]
  },
  {
    id: "mem_2",
    name: "Martín Alvarez",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    email: "martin.alvarez@email.com",
    phone: "+595 971 593211",
    memberSince: "10 Feb 2026",
    planName: "Musculación 3 Días x Semana",
    planPrice: 150000,
    paymentMethod: "efectivo",
    paymentStatus: "pendiente",
    nextDueDate: "2026-09-05",
    daysAbsent: 5,
    streakDays: 0,
    lastAttended: "Hace 5 días",
    goal: "Bajar porcentaje de grasa y recuperar condición física",
    injuriesNotes: "Sin lesiones actuales.",
    todayMood: "desmotivado",
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: "pay_201",
        date: "2026-08-05",
        amount: 150000,
        method: "efectivo",
        period: "Agosto 2026",
        receiptNote: "Cobrado en recepción en efectivo",
        verified: true
      }
    ],
    routines: [
      {
        id: "rout_m1",
        dayOfWeek: "Lunes",
        title: "Full Body Funcional & Hipertrofia A",
        durationMin: 45,
        completedToday: false,
        exercises: [
          {
            id: "ex_m1",
            name: "Prensa de Piernas 45°",
            muscleGroup: "Piernas",
            sets: 3,
            reps: "12",
            targetWeightKg: 80,
            restSeconds: 75,
            notes: "Pies al ancho de hombros, bajar profundo.",
            completedSets: [false, false, false]
          },
          {
            id: "ex_m2",
            name: "Jalón al Pecho en Polea",
            muscleGroup: "Espalda",
            sets: 3,
            reps: "12",
            targetWeightKg: 40,
            restSeconds: 60,
            notes: "Pecho afuera, llevar barra a la clavícula.",
            completedSets: [false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: "w_m1", date: "2026-07-10", weightKg: 89.5, note: "Pesaje de ingreso" },
      { id: "w_m2", date: "2026-08-10", weightKg: 88.0, note: "Pérdida inicial de líquidos" },
      { id: "w_m3", date: "2026-09-01", weightKg: 87.2, note: "Descenso sostenido" }
    ],
    photos: [],
    messages: [
      {
        id: "msg_m1",
        type: "absent_funny",
        title: "¡Alerta de rescate fitness! 🚨",
        content: "Martín, hace 5 días que no aparecés por el gym. Las mancuernas de 15kg están llorando tu ausencia. ¡Vení hoy que el sillón no quema calorías!",
        date: "Ayer 18:00 hs",
        sender: "GymBro Team",
        read: false
      }
    ]
  },
  {
    id: "mem_3",
    name: "Camila Benítez",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    email: "camila.benitez@email.com",
    phone: "+595 991 784552",
    memberSince: "02 Ene 2026",
    planName: "Pase Libre Total + Clases",
    planPrice: 180000,
    paymentMethod: "efectivo",
    paymentStatus: "al_dia",
    nextDueDate: "2026-10-02",
    daysAbsent: 1,
    streakDays: 9,
    lastAttended: "Ayer (19:00 hs)",
    goal: "Tonificación general y aumento de glúteos",
    injuriesNotes: "Ninguna. Excelente flexibilidad y técnica.",
    todayMood: "cansado",
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: "pay_301",
        date: "2026-09-02",
        amount: 180000,
        method: "efectivo",
        period: "Septiembre 2026",
        receiptNote: "Abonado en efectivo en caja",
        verified: true
      }
    ],
    routines: [
      {
        id: "rout_c1",
        dayOfWeek: "Miércoles",
        title: "Tren Inferior: Glúteos y Femoral Intenso",
        durationMin: 50,
        completedToday: false,
        exercises: [
          {
            id: "ex_c1",
            name: "Hip Thrust con Barra en Banco",
            muscleGroup: "Glúteos",
            sets: 4,
            reps: "12",
            targetWeightKg: 70,
            restSeconds: 90,
            notes: "Apretar 2 segundos arriba en contracción máxima.",
            completedSets: [false, false, false, false]
          },
          {
            id: "ex_c2",
            name: "Peso Muerto Rumano",
            muscleGroup: "Espalda / Isquios",
            sets: 4,
            reps: "10-12",
            targetWeightKg: 45,
            restSeconds: 75,
            notes: "Flexión leve de rodilla, empujar cadera hacia atrás.",
            completedSets: [false, false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: "w_c1", date: "2026-06-15", weightKg: 62.0, note: "Inicio pesaje" },
      { id: "w_c2", date: "2026-07-20", weightKg: 61.4, note: "Mejora en definición" },
      { id: "w_c3", date: "2026-08-25", weightKg: 60.8, note: "Cintura más reducida" },
      { id: "w_c4", date: "2026-09-08", weightKg: 60.5, note: "Excelente tono muscular" }
    ],
    photos: [
      {
        id: "p_c1",
        date: "2026-07-01",
        imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
        tag: "Perfil",
        weightKg: 61.8,
        note: "Inicio de seguimiento fotográfico"
      }
    ],
    messages: [
      {
        id: "msg_c1",
        type: "support_motivational",
        title: "¡Escuchá a tu cuerpo hoy! 💛",
        content: "Cami, si hoy estás cansada no te exijas con peso máximo. Vení a hacer una sesión de activación suave y movilidad. ¡La constancia también es saber cuidarse!",
        date: "Hoy 09:15 hs",
        sender: "Coach GymBro",
        read: false
      }
    ]
  },
  {
    id: "mem_4",
    name: "Sofía Méndez",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
    email: "sofia.mendez@email.com",
    phone: "+54 9 11 33217788",
    memberSince: "14 May 2026",
    planName: "Musculación + Funcional",
    planPrice: 160000,
    paymentMethod: "transferencia",
    paymentStatus: "al_dia",
    nextDueDate: "2026-09-20",
    daysAbsent: 2,
    streakDays: 4,
    lastAttended: "Hace 2 días",
    goal: "Resistencia cardiovascular y salud postural",
    injuriesNotes: "Rectificación cervical, evitar cargas directas sobre el cuello.",
    todayMood: "adolorido",
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: "pay_401",
        date: "2026-08-20",
        amount: 160000,
        method: "transferencia",
        period: "Agosto/Septiembre 2026",
        receiptNote: "Transferencia bancaria #3301",
        verified: true
      }
    ],
    routines: [
      {
        id: "rout_s1",
        dayOfWeek: "Viernes",
        title: "Espalda, Hombro Posterior y Core",
        durationMin: 45,
        completedToday: false,
        exercises: [
          {
            id: "ex_s1",
            name: "Jalón al Pecho en Polea",
            muscleGroup: "Espalda",
            sets: 3,
            reps: "12",
            targetWeightKg: 35,
            restSeconds: 60,
            notes: "Apertura neutra.",
            completedSets: [false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: "w_s1", date: "2026-07-01", weightKg: 58.2, note: "Inicio" }
    ],
    photos: [],
    messages: [
      {
        id: "msg_s1",
        type: "support_motivational",
        title: "¡Ánimo Sofi, vos podés! 💪",
        content: "Vimos que marcaste molestia muscular. Hacé 10 minutos de foam roller y estiramientos suaves antes de arrancar. ¡Acá estamos para asesorarte!",
        date: "Ayer 16:00 hs",
        sender: "Coach GymBro",
        read: true
      }
    ]
  }
];

let inMemoryStore: ServerGymStore | null = null;

function loadServerGymStore(): ServerGymStore {
  if (inMemoryStore) return inMemoryStore;

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
        inMemoryStore = {
          members: parsed.members,
          settings: { ...DEFAULT_SERVER_SETTINGS, ...(parsed.settings || {}) },
          lastUpdated: parsed.lastUpdated || Date.now(),
        };
        return inMemoryStore;
      }
    }
  } catch (err) {
    console.error("Error reading gym_database.json, falling back to default:", err);
  }

  inMemoryStore = {
    members: DEFAULT_INITIAL_MEMBERS,
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

// API: Multi-device Data Synchronization (Computer <-> Cellphone)
app.get("/api/gym-data", (_req, res) => {
  const store = loadServerGymStore();
  res.json({
    members: store.members,
    settings: store.settings,
    lastUpdated: store.lastUpdated,
  });
});

app.post("/api/gym-data", (req, res) => {
  try {
    const { members, settings } = req.body;
    const store = loadServerGymStore();

    if (Array.isArray(members)) {
      store.members = members;
    }
    if (settings && typeof settings === "object") {
      store.settings = { ...store.settings, ...settings };
    }
    store.lastUpdated = Date.now();
    saveServerGymStore(store);

    res.json({
      success: true,
      lastUpdated: store.lastUpdated,
      membersCount: store.members.length,
      members: store.members,
      settings: store.settings,
    });
  } catch (err: any) {
    console.error("Error in POST /api/gym-data:", err);
    res.status(500).json({ error: err?.message || "Failed to save gym data" });
  }
});

app.post("/api/gym-data/reset", (_req, res) => {
  try {
    const store: ServerGymStore = {
      members: DEFAULT_INITIAL_MEMBERS,
      settings: DEFAULT_SERVER_SETTINGS,
      lastUpdated: Date.now(),
    };
    saveServerGymStore(store);
    res.json({ success: true, ...store });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to reset" });
  }
});

// API: Generate GymBro AI Messages
app.post("/api/ai/message", async (req, res) => {
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
app.post("/api/ai/routine", async (req, res) => {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GymBro Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
