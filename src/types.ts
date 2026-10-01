export type PaymentMethod = 'efectivo' | 'transferencia';
export type PaymentStatus = 'al_dia' | 'pendiente' | 'vencido';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  period: string;
  receiptNote?: string;
  verified: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  targetWeightKg: number;
  restSeconds: number;
  notes?: string;
  completedSets?: boolean[];
}

export interface DailyWorkout {
  id: string;
  dayOfWeek: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  title: string;
  durationMin: number;
  exercises: Exercise[];
  completedToday?: boolean;
}

export interface WeightMetric {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  legCm?: number;
  photoUrl?: string;
  note?: string;
  loggedBy?: 'student' | 'trainer' | 'owner';
}

export interface ProgressPhoto {
  id: string;
  date: string;
  imageUrl: string;
  tag: 'Frente' | 'Perfil' | 'Espalda' | 'General';
  weightKg?: number;
  note?: string;
}

export interface GymMessage {
  id: string;
  type: 'payment_reminder' | 'workout_reminder' | 'absent_funny' | 'support_motivational';
  title: string;
  content: string;
  date: string;
  sender: string;
  read: boolean;
  funnyMode?: string;
  senderRole?: 'owner' | 'trainer' | 'mascot';
}

export interface GymMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  memberSince: string;
  planName: string;
  planPrice: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  nextDueDate: string;
  pendingPaymentApproval?: {
    requestedAt: string;
    method: PaymentMethod;
    note?: string;
  };
  paymentsHistory: PaymentRecord[];
  routines: DailyWorkout[];
  weightHistory: WeightMetric[];
  photos: ProgressPhoto[];
  messages: GymMessage[];
  daysAbsent: number;
  streakDays: number;
  lastAttended: string;
  goal: string;
  injuriesNotes?: string;
  birthDate?: string;
  bio?: string;
  description?: string;
  todayMood?: 'energia' | 'cansado' | 'desmotivado' | 'adolorido';
  todayWorkoutCompleted?: boolean;
  // Membership & Trainer Assignment (Relación 1 a N)
  membershipType?: 'mensual' | 'diario';
  baseMembershipPrice?: number;
  hasPersonalTrainer?: boolean;
  personalTrainerPrice?: number;
  assignedTrainerId?: string;
  assignedTrainerName?: string;
  trainingShift?: 'mañana' | 'tarde' | 'noche' | 'libre';
  trainingScheduleNote?: string;
}

export interface GymSettings {
  gymName: string;
  tagline: string;
  phone: string;
  address: string;
  currencySymbol: string;
  monthlyDefaultPrice: number;
  ownerName: string;
  supportEmail: string;
}

export type UserRole = 'owner' | 'student' | 'trainer';
export type PortalType = 'owner' | 'student' | 'trainer' | 'gateway';

export interface AuthUser {
  id: string;
  username: string;
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

export type ActiveRole = 'owner' | 'client' | 'trainer';
export type OwnerViewTab = 'members' | 'routines' | 'payments' | 'messages' | 'commercial';
export type ClientViewTab = 'routine' | 'weight' | 'photos' | 'messages' | 'membership';
export type TrainerViewTab = 'assigned_members' | 'routines' | 'progress' | 'messages';
