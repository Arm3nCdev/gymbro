import { GymMember } from '../types';

export const INITIAL_EXERCISE_LIBRARY = [
  // Pecho
  { name: 'Press de Banca Plano con Barra', muscleGroup: 'Pecho', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Press Inclinado con Mancuernas', muscleGroup: 'Pecho', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Aperturas en Poleas / Peck Deck', muscleGroup: 'Pecho', defaultSets: 3, defaultReps: '15', defaultRest: 60 },
  { name: 'Fondos en Paralelas (Dips)', muscleGroup: 'Pecho', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  // Espalda
  { name: 'Jalón al Pecho en Polea', muscleGroup: 'Espalda', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Remo con Barra T o Mancuerna', muscleGroup: 'Espalda', defaultSets: 4, defaultReps: '10', defaultRest: 90 },
  { name: 'Remo en Polea Baja (Gironda)', muscleGroup: 'Espalda', defaultSets: 3, defaultReps: '12', defaultRest: 60 },
  { name: 'Peso Muerto Rumano', muscleGroup: 'Espalda / Isquios', defaultSets: 4, defaultReps: '8-10', defaultRest: 120 },
  // Piernas
  { name: 'Sentadilla Libre con Barra', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '8-10', defaultRest: 120 },
  { name: 'Prensa de Piernas 45°', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '12-15', defaultRest: 90 },
  { name: 'Sillón de Cuádriceps (Extensiones)', muscleGroup: 'Cuádriceps', defaultSets: 3, defaultReps: '15', defaultRest: 60 },
  { name: 'Curl Femoral Tumbado', muscleGroup: 'Isquiosurales', defaultSets: 4, defaultReps: '12', defaultRest: 60 },
  { name: 'Elevación de Gemelos de Pie', muscleGroup: 'Gemelos', defaultSets: 4, defaultReps: '15-20', defaultRest: 45 },
  // Hombros
  { name: 'Press Militar de Hombros', muscleGroup: 'Hombros', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Elevaciones Laterales con Mancuerna', muscleGroup: 'Hombros', defaultSets: 4, defaultReps: '15', defaultRest: 45 },
  { name: 'Pájaros / Deltoides Posterior', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '15', defaultRest: 60 },
  // Brazos
  { name: 'Curl de Bíceps con Barra Z', muscleGroup: 'Bíceps', defaultSets: 3, defaultReps: '12', defaultRest: 60 },
  { name: 'Curl Martillo con Mancuernas', muscleGroup: 'Bíceps', defaultSets: 3, defaultReps: '12', defaultRest: 60 },
  { name: 'Extensión de Tríceps en Polea Alta', muscleGroup: 'Tríceps', defaultSets: 4, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Press Francés con Mancuernas', muscleGroup: 'Tríceps', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  // Core & Cardio
  { name: 'Plancha Isométrica', muscleGroup: 'Core', defaultSets: 3, defaultReps: '45 seg', defaultRest: 45 },
  { name: 'Elevación de Piernas en Barra', muscleGroup: 'Core', defaultSets: 3, defaultReps: '15', defaultRest: 45 },
  { name: 'HIIT en Cinta / Cinta Inclinada', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: '20 min', defaultRest: 0 }
];

export const INITIAL_MEMBERS: GymMember[] = [
  {
    id: 'mem_1',
    name: 'Lucas Rossi',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    email: 'lucas.rossi@email.com',
    phone: '+595 981 482199',
    memberSince: '15 Mar 2026',
    planName: 'Pase Libre Total Musculación',
    planPrice: 180000,
    paymentMethod: 'transferencia',
    paymentStatus: 'al_dia',
    nextDueDate: '2026-09-28',
    daysAbsent: 0,
    streakDays: 14,
    lastAttended: 'Hoy (08:30 hs)',
    goal: 'Aumento de masa muscular (Hipertrofia) y fuerza',
    injuriesNotes: 'Molestia leve en hombro izquierdo con cargas máximas en press militar.',
    todayMood: 'energia',
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: 'pay_101',
        date: '2026-08-28',
        amount: 180000,
        method: 'transferencia',
        period: 'Septiembre 2026',
        receiptNote: 'Comprobante #9412 - Transferencia SIPAP',
        verified: true
      },
      {
        id: 'pay_102',
        date: '2026-07-28',
        amount: 160000,
        method: 'transferencia',
        period: 'Agosto 2026',
        receiptNote: 'Comprobante #8120 - Transferencia Bancaria',
        verified: true
      }
    ],
    routines: [
      {
        id: 'rout_1',
        dayOfWeek: 'Lunes',
        title: 'Pecho, Hombro y Tríceps (Empuje Pesado)',
        durationMin: 55,
        completedToday: false,
        exercises: [
          {
            id: 'ex_1',
            name: 'Press de Banca Plano con Barra',
            muscleGroup: 'Pecho',
            sets: 4,
            reps: '8-10',
            targetWeightKg: 75,
            restSeconds: 90,
            notes: 'Buena retracción escapular, baja controlado en 3 segundos.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_2',
            name: 'Press Inclinado con Mancuernas',
            muscleGroup: 'Pecho',
            sets: 4,
            reps: '10-12',
            targetWeightKg: 24,
            restSeconds: 75,
            notes: 'Banco a 30 grados, estirar bien abajo.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_3',
            name: 'Elevaciones Laterales con Mancuerna',
            muscleGroup: 'Hombros',
            sets: 4,
            reps: '15',
            targetWeightKg: 12,
            restSeconds: 60,
            notes: 'Control en el descenso, no impulsarse con el cuerpo.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_4',
            name: 'Extensión de Tríceps en Polea Alta',
            muscleGroup: 'Tríceps',
            sets: 4,
            reps: '12-15',
            targetWeightKg: 30,
            restSeconds: 60,
            notes: 'Codos pegados al torso, apertura final con soga.',
            completedSets: [false, false, false, false]
          }
        ]
      },
      {
        id: 'rout_2',
        dayOfWeek: 'Martes',
        title: 'Espalda y Bíceps (Tracción y Densidad)',
        durationMin: 50,
        completedToday: false,
        exercises: [
          {
            id: 'ex_5',
            name: 'Jalón al Pecho en Polea',
            muscleGroup: 'Espalda',
            sets: 4,
            reps: '10-12',
            targetWeightKg: 60,
            restSeconds: 75,
            notes: 'Aguantar 1 seg en la contracción.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_6',
            name: 'Remo con Mancuerna en Banco',
            muscleGroup: 'Espalda',
            sets: 4,
            reps: '12',
            targetWeightKg: 26,
            restSeconds: 60,
            notes: 'Llevar codo pegado a la cadera.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_7',
            name: 'Curl de Bíceps con Barra Z',
            muscleGroup: 'Bíceps',
            sets: 3,
            reps: '12',
            targetWeightKg: 25,
            restSeconds: 60,
            notes: 'Rango estricto sin mover los hombros.',
            completedSets: [false, false, false]
          }
        ]
      },
      {
        id: 'rout_3',
        dayOfWeek: 'Jueves',
        title: 'Piernas Completo (Fuerza Inferior)',
        durationMin: 60,
        completedToday: false,
        exercises: [
          {
            id: 'ex_8',
            name: 'Sentadilla Libre con Barra',
            muscleGroup: 'Piernas',
            sets: 4,
            reps: '8',
            targetWeightKg: 90,
            restSeconds: 120,
            notes: 'Respiración diafragmática (valsalva), profundidad a 90°.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_9',
            name: 'Prensa de Piernas 45°',
            muscleGroup: 'Piernas',
            sets: 3,
            reps: '12',
            targetWeightKg: 140,
            restSeconds: 90,
            notes: 'Pies al ancho de hombros.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_10',
            name: 'Curl Femoral Tumbado',
            muscleGroup: 'Isquiosurales',
            sets: 4,
            reps: '12',
            targetWeightKg: 35,
            restSeconds: 60,
            notes: 'Evitar levantar la pelvis.',
            completedSets: [false, false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: 'w_1', date: '2026-07-01', weightKg: 78.4, note: 'Inicio de volumen limpio' },
      { id: 'w_2', date: '2026-07-22', weightKg: 79.2, note: 'Buena ganancia de fuerza' },
      { id: 'w_3', date: '2026-08-15', weightKg: 80.1, note: 'Comiendo con superávit calórico' },
      { id: 'w_4', date: '2026-09-02', weightKg: 80.8, note: 'Control en balanza semanal' },
      { id: 'w_5', date: '2026-09-09', weightKg: 81.3, note: 'Récord personal en sentadilla' }
    ],
    photos: [
      {
        id: 'p_1',
        date: '2026-07-05',
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80',
        tag: 'Frente',
        weightKg: 78.4,
        note: 'Foto inicial al empezar el plan de volumen con GymBro'
      },
      {
        id: 'p_2',
        date: '2026-09-05',
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
        tag: 'Frente',
        weightKg: 81.0,
        note: 'Progreso luego de 2 meses: hombros y pecho con mucho más relieve'
      }
    ],
    messages: [
      {
        id: 'msg_1',
        type: 'workout_reminder',
        title: '¡Hoy toca Empuje Pesado! 🔥',
        content: '¡Buenas Lucas! Recordá que hoy tenés press plano y hombros. Meté una buena entrada en calor para cuidar ese hombro izquierdo.',
        date: 'Hoy 07:00 hs',
        sender: 'Coach GymBro',
        read: false
      },
      {
        id: 'msg_2',
        type: 'payment_reminder',
        title: 'Pago registrado con éxito 📲',
        content: 'Muchas gracias Lucas. Recibimos tu transferencia bancaria de ₲ 180.000. Tu cuota queda cubierta hasta el 28 de Septiembre.',
        date: '28 Ago 2026',
        sender: 'Gimnasio GymBro',
        read: true
      }
    ]
  },
  {
    id: 'mem_2',
    name: 'Martín Alvarez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    email: 'martin.alvarez@email.com',
    phone: '+595 971 593211',
    memberSince: '10 Feb 2026',
    planName: 'Musculación 3 Días x Semana',
    planPrice: 150000,
    paymentMethod: 'efectivo',
    paymentStatus: 'pendiente',
    nextDueDate: '2026-09-05',
    daysAbsent: 5,
    streakDays: 0,
    lastAttended: 'Hace 5 días',
    goal: 'Bajar porcentaje de grasa y recuperar condición física',
    injuriesNotes: 'Sin lesiones actuales.',
    todayMood: 'desmotivado',
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: 'pay_201',
        date: '2026-08-05',
        amount: 150000,
        method: 'efectivo',
        period: 'Agosto 2026',
        receiptNote: 'Cobrado en recepción en efectivo (₲ 150.000)',
        verified: true
      }
    ],
    routines: [
      {
        id: 'rout_m1',
        dayOfWeek: 'Lunes',
        title: 'Full Body Funcional & Hipertrofia A',
        durationMin: 45,
        completedToday: false,
        exercises: [
          {
            id: 'ex_m1',
            name: 'Prensa de Piernas 45°',
            muscleGroup: 'Piernas',
            sets: 3,
            reps: '12',
            targetWeightKg: 100,
            restSeconds: 60,
            notes: 'Ritmo constante.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_m2',
            name: 'Remo en Polea Baja (Gironda)',
            muscleGroup: 'Espalda',
            sets: 3,
            reps: '12',
            targetWeightKg: 40,
            restSeconds: 60,
            notes: 'Espalda erguida.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_m3',
            name: 'Press de Banca Plano con Barra',
            muscleGroup: 'Pecho',
            sets: 3,
            reps: '10',
            targetWeightKg: 50,
            restSeconds: 75,
            notes: 'Bajada suave.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_m4',
            name: 'HIIT en Cinta / Cinta Inclinada',
            muscleGroup: 'Cardio',
            sets: 1,
            reps: '15 min',
            targetWeightKg: 0,
            restSeconds: 0,
            notes: 'Inclinación 8%, velocidad 5.5 km/h.',
            completedSets: [false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: 'w_m1', date: '2026-08-01', weightKg: 89.5, note: 'Inicio del plan de definición' },
      { id: 'w_m2', date: '2026-08-20', weightKg: 88.2, note: 'Buena baja de líquido y volumen abdominal' },
      { id: 'w_m3', date: '2026-09-02', weightKg: 87.7, note: 'Pesaje previo al fin de semana' }
    ],
    photos: [
      {
        id: 'p_m1',
        date: '2026-08-01',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80',
        tag: 'Frente',
        weightKg: 89.5,
        note: 'Foto inicio de transformación'
      }
    ],
    messages: [
      {
        id: 'msg_m1',
        type: 'absent_funny',
        title: '¡Desaparecido en combate! 🚨',
        content: '¡Che Martín! Van 5 días sin verte. La mancuerna de 14kg ya preguntó si te pasó algo o si el delivery de empanadas te secuestró. ¡Vení hoy que te cuidamos la máquina!',
        date: 'Ayer 18:30 hs',
        sender: 'GymBro',
        read: false
      },
      {
        id: 'msg_m2',
        type: 'payment_reminder',
        title: 'Aviso de cuota pendiente 💵',
        content: 'Hola Martín, recordá que tu cuota de Septiembre ($32.000) venció el día 5. Podés abonar en recepción en efectivo o si preferís te pasamos el alias de transferencia.',
        date: '06 Sep 2026',
        sender: 'Recepción GymBro',
        read: false
      }
    ]
  },
  {
    id: 'mem_3',
    name: 'Camila Benítez',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    email: 'camilabenitez@email.com',
    phone: '+595 991 784552',
    memberSince: '02 Ene 2026',
    planName: 'Pase Libre Total Musculación',
    planPrice: 180000,
    paymentMethod: 'efectivo',
    paymentStatus: 'al_dia',
    nextDueDate: '2026-10-02',
    daysAbsent: 1,
    streakDays: 8,
    lastAttended: 'Ayer (19:15 hs)',
    goal: 'Glúteos, femoral y tono muscular general',
    injuriesNotes: 'Cuidar rodilla derecha en impactos o saltos.',
    todayMood: 'cansado',
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: 'pay_301',
        date: '2026-09-02',
        amount: 180000,
        method: 'efectivo',
        period: 'Septiembre 2026',
        receiptNote: 'Abonado en efectivo en el gym (₲ 180.000)',
        verified: true
      },
      {
        id: 'pay_302',
        date: '2026-08-02',
        amount: 160000,
        method: 'efectivo',
        period: 'Agosto 2026',
        receiptNote: 'Efectivo mesa de entrada',
        verified: true
      }
    ],
    routines: [
      {
        id: 'rout_c1',
        dayOfWeek: 'Miércoles',
        title: 'Tren Inferior: Glúteos y Femoral Intenso',
        durationMin: 50,
        completedToday: false,
        exercises: [
          {
            id: 'ex_c1',
            name: 'Hip Thrust con Barra en Banco',
            muscleGroup: 'Glúteos',
            sets: 4,
            reps: '12',
            targetWeightKg: 70,
            restSeconds: 90,
            notes: 'Apretar 2 segundos arriba en contracción máxima.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_c2',
            name: 'Peso Muerto Rumano',
            muscleGroup: 'Espalda / Isquios',
            sets: 4,
            reps: '10-12',
            targetWeightKg: 45,
            restSeconds: 75,
            notes: 'Flexión leve de rodilla, empujar cadera hacia atrás.',
            completedSets: [false, false, false, false]
          },
          {
            id: 'ex_c3',
            name: 'Prensa de Piernas 45°',
            muscleGroup: 'Piernas',
            sets: 3,
            reps: '15',
            targetWeightKg: 90,
            restSeconds: 60,
            notes: 'Pies en la parte alta de la plataforma.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_c4',
            name: 'Patada de Glúteo en Polea',
            muscleGroup: 'Glúteos',
            sets: 3,
            reps: '15 c/lado',
            targetWeightKg: 15,
            restSeconds: 45,
            notes: 'Espalda neutra.',
            completedSets: [false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: 'w_c1', date: '2026-06-15', weightKg: 62.0, note: 'Inicio pesaje' },
      { id: 'w_c2', date: '2026-07-20', weightKg: 61.4, note: 'Mejora en definición' },
      { id: 'w_c3', date: '2026-08-25', weightKg: 60.8, note: 'Cintura más reducida' },
      { id: 'w_c4', date: '2026-09-08', weightKg: 60.5, note: 'Excelente tono muscular' }
    ],
    photos: [
      {
        id: 'p_c1',
        date: '2026-07-01',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
        tag: 'Perfil',
        weightKg: 61.8,
        note: 'Inicio de seguimiento fotográfico'
      },
      {
        id: 'p_c2',
        date: '2026-09-01',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        tag: 'Perfil',
        weightKg: 60.6,
        note: 'Gran tonificación y postura corregida'
      }
    ],
    messages: [
      {
        id: 'msg_c1',
        type: 'support_motivational',
        title: '¡Escuchá a tu cuerpo hoy! 💛',
        content: 'Cami, si hoy estás cansada no te exijas con peso máximo. Vení a hacer una sesión de activación suave y movilidad. ¡La constancia también es saber cuidarse!',
        date: 'Hoy 09:15 hs',
        sender: 'Coach GymBro',
        read: false
      }
    ]
  },
  {
    id: 'mem_4',
    name: 'Sofía Méndez',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    email: 'sofia.mendez@email.com',
    phone: '+54 9 11 3321-7788',
    memberSince: '14 May 2026',
    planName: 'Musculación + Funcional',
    planPrice: 200000,
    paymentMethod: 'transferencia',
    paymentStatus: 'al_dia',
    nextDueDate: '2026-09-20',
    daysAbsent: 2,
    streakDays: 4,
    lastAttended: 'Hace 2 días',
    goal: 'Resistencia cardiovascular y salud postural',
    injuriesNotes: 'Rectificación cervical, evitar cargas directas sobre el cuello.',
    todayMood: 'adolorido',
    todayWorkoutCompleted: false,
    paymentsHistory: [
      {
        id: 'pay_401',
        date: '2026-08-20',
        amount: 200000,
        method: 'transferencia',
        period: 'Agosto/Septiembre 2026',
        receiptNote: 'Transferencia Bancaria #3301',
        verified: true
      }
    ],
    routines: [
      {
        id: 'rout_s1',
        dayOfWeek: 'Viernes',
        title: 'Espalda, Hombro Posterior y Core',
        durationMin: 45,
        completedToday: false,
        exercises: [
          {
            id: 'ex_s1',
            name: 'Jalón al Pecho en Polea',
            muscleGroup: 'Espalda',
            sets: 3,
            reps: '12',
            targetWeightKg: 35,
            restSeconds: 60,
            notes: 'Apertura neutra.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_s2',
            name: 'Pájaros / Deltoides Posterior',
            muscleGroup: 'Hombros',
            sets: 3,
            reps: '15',
            targetWeightKg: 5,
            restSeconds: 45,
            notes: 'Foco en postura y escápulas.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_s3',
            name: 'Plancha Isométrica',
            muscleGroup: 'Core',
            sets: 3,
            reps: '40 seg',
            targetWeightKg: 0,
            restSeconds: 45,
            notes: 'Alineación de columna sin hiperextender.',
            completedSets: [false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: 'w_s1', date: '2026-07-01', weightKg: 58.2, note: 'Inicio' },
      { id: 'w_s2', date: '2026-08-01', weightKg: 57.5, note: 'Menor retención' },
      { id: 'w_s3', date: '2026-09-01', weightKg: 57.0, note: 'Objetivo saludable alcanzado' }
    ],
    photos: [],
    messages: [
      {
        id: 'msg_s1',
        type: 'support_motivational',
        title: '¡Ánimo Sofi, vos podés! 💪',
        content: 'Vimos que marcaste molestia muscular. Hacé 10 minutos de foam roller y estiramientos suaves antes de arrancar. ¡Acá estamos para asesorarte!',
        date: 'Ayer 16:00 hs',
        sender: 'Coach GymBro',
        read: true
      }
    ]
  },
  {
    id: 'mem_5',
    name: 'Diego Fernández',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    email: 'diego.fernandez@email.com',
    phone: '+54 9 11 9876-5432',
    memberSince: '01 Sep 2026',
    planName: 'Pase Libre Total Musculación',
    planPrice: 38000,
    paymentMethod: 'efectivo',
    paymentStatus: 'pendiente',
    nextDueDate: '2026-09-08',
    daysAbsent: 4,
    streakDays: 1,
    lastAttended: 'Hace 4 días',
    goal: 'Acondicionamiento general y aumento de fuerza',
    injuriesNotes: 'Principiante en pesas.',
    todayMood: 'cansado',
    todayWorkoutCompleted: false,
    paymentsHistory: [],
    routines: [
      {
        id: 'rout_d1',
        dayOfWeek: 'Lunes',
        title: 'Iniciación a la Fuerza - Día A',
        durationMin: 45,
        completedToday: false,
        exercises: [
          {
            id: 'ex_d1',
            name: 'Prensa de Piernas 45°',
            muscleGroup: 'Piernas',
            sets: 3,
            reps: '12',
            targetWeightKg: 60,
            restSeconds: 75,
            notes: 'Aprender la técnica y no trabar rodillas.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_d2',
            name: 'Jalón al Pecho en Polea',
            muscleGroup: 'Espalda',
            sets: 3,
            reps: '12',
            targetWeightKg: 35,
            restSeconds: 60,
            notes: 'Bajar con el pecho inflado.',
            completedSets: [false, false, false]
          },
          {
            id: 'ex_d3',
            name: 'Press de Banca Plano con Barra',
            muscleGroup: 'Pecho',
            sets: 3,
            reps: '10',
            targetWeightKg: 30,
            restSeconds: 75,
            notes: 'Solo barra olímpica de 20kg + 5kg por lado.',
            completedSets: [false, false, false]
          }
        ]
      }
    ],
    weightHistory: [
      { id: 'w_d1', date: '2026-09-01', weightKg: 84.0, note: 'Pesaje inicial al inscribirse' }
    ],
    photos: [],
    messages: [
      {
        id: 'msg_d1',
        type: 'absent_funny',
        title: '¡No nos abandones la primera semana! 😅',
        content: '¡Diego! Ya sabemos que las agujetas del primer día son bravas, pero no te quedes en la cama que se endurecen los músculos. ¡Vení a aflojar!',
        date: 'Hace 2 días',
        sender: 'GymBro',
        read: false
      }
    ]
  }
];
