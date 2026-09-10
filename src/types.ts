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
  note?: string;
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
  todayMood?: 'energia' | 'cansado' | 'desmotivado' | 'adolorido';
  todayWorkoutCompleted?: boolean;
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

export type ActiveRole = 'owner' | 'client';
export type OwnerViewTab = 'members' | 'routines' | 'payments' | 'messages' | 'commercial';
export type ClientViewTab = 'routine' | 'weight' | 'photos' | 'messages' | 'membership';
