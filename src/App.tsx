import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Users,
  CreditCard,
  MessageSquare,
  Smartphone,
  Laptop,
  Plus,
  RotateCcw,
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
  AlertCircle,
  Download,
  Sliders,
  RefreshCw,
  Cloud,
  LogOut,
  Globe,
  UserCheck,
  Share2,
} from 'lucide-react';
import { AuthUser, DailyWorkout, GymMember, GymMessage, ProgressPhoto, WeightMetric, GymSettings, OwnerViewTab, PaymentMethod } from './types';
import { INITIAL_MEMBERS } from './data/initialData';
import {
  loadFromStorage,
  saveToStorage,
  loadGymSettings,
  saveGymSettings,
  DEFAULT_SETTINGS,
  fetchServerGymData,
  pushServerGymData,
  resetServerGymData,
  serverNotifyPayment,
  serverApprovePayment,
  serverUpdateRoutine,
} from './utils/storage';
import { getCurrentAuthUser, saveAuthSession, clearAuthSession, getStoredUsers, saveStoredUsers } from './utils/auth';

// Owner Components
import { MembersList } from './components/owner/MembersList';
import { PaymentsTracker } from './components/owner/PaymentsTracker';
import { RoutinesManager } from './components/owner/RoutinesManager';
import { MessagingCenter } from './components/owner/MessagingCenter';
import { MemberDetailModal } from './components/owner/MemberDetailModal';
import { CommercialCenter } from './components/owner/CommercialCenter';

// Client Components
import { ClientPortal } from './components/client/ClientPortal';

// Trainer Components
import { TrainerPortal } from './components/trainer/TrainerPortal';

// Auth Component
import { AuthScreen } from './components/auth/AuthScreen';

// Common Components
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { GymBroMascot } from './components/common/GymBroMascot';
import { PortalLinksModal } from './components/common/PortalLinksModal';

// Modals
import { NewMemberModal } from './components/modals/NewMemberModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { SendMessageModal } from './components/modals/SendMessageModal';

// Helper to read portal from URL hash or query params with full alias support
const getInitialPortal = (): 'student' | 'trainer' | 'owner' => {
  if (typeof window === 'undefined') return 'student';
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();

  let paramPortal = '';
  try {
    const params = new URLSearchParams(window.location.search);
    paramPortal = (params.get('portal') || params.get('role') || params.get('p') || params.get('view') || '').toLowerCase();
  } catch {
    // ignore
  }

  const combined = `${hash} ${search} ${paramPortal}`;

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
};

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentAuthUser());

  // Active Portal routing ('student' | 'trainer' | 'owner')
  const [activePortal, setActivePortal] = useState<'student' | 'trainer' | 'owner'>(getInitialPortal);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);

  const changePortal = (p: 'student' | 'trainer' | 'owner') => {
    setActivePortal(p);
    const targetHash = p === 'owner' ? '#/dueno' : p === 'trainer' ? '#/coach' : '#/alumno';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // Sync portal state if user navigates via browser address, back/forward, or history
  useEffect(() => {
    const handleHashChange = () => {
      setActivePortal(getInitialPortal());
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Gym Settings & Branding
  const [settings, setSettings] = useState<GymSettings>(() => loadGymSettings());

  // Members State (Zero test users by default)
  const [members, setMembers] = useState<GymMember[]>(() => {
    return loadFromStorage([]);
  });

  // Cloud Sync State for real-time Notebook/PC <-> Phone synchronization
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Reciente');
  const isInitialMount = useRef(true);
  const lastKnownServerTimestamp = useRef<number>(0);
  const isPushing = useRef(false);

  // Owner Sub-tabs: 'members' | 'routines' | 'payments' | 'messages' | 'commercial'
  const [ownerTab, setOwnerTab] = useState<OwnerViewTab>('members');

  // Client Selected Member ID (matches logged-in student or default)
  const [clientMemberId, setClientMemberId] = useState<string>(() => {
    const savedUser = getCurrentAuthUser();
    if (savedUser && savedUser.role === 'student' && savedUser.memberId) {
      return savedUser.memberId;
    }
    return '';
  });

  // Modals state
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [paymentTargetMemberId, setPaymentTargetMemberId] = useState<string | null>(null);
  const [messageTargetMemberId, setMessageTargetMemberId] = useState<string | null>(null);
  const [messageInitialType, setMessageInitialType] = useState<any>(undefined);
  const [detailTargetMember, setDetailTargetMember] = useState<GymMember | null>(null);
  const [routineManagerTargetId, setRoutineManagerTargetId] = useState<string | undefined>(undefined);

  // Synchronize student ID when currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && currentUser.memberId) {
      setClientMemberId(currentUser.memberId);
    }
  }, [currentUser]);

  // Auth Handlers
  const handleAuthSuccess = (user: AuthUser, newMemberCreated?: GymMember) => {
    if (newMemberCreated) {
      setMembers((prev) => [newMemberCreated, ...prev]);
    }
    setCurrentUser(user);
    if (user.role === 'student') {
      if (user.memberId) setClientMemberId(user.memberId);
      changePortal('student');
    } else if (user.role === 'trainer') {
      changePortal('trainer');
    } else {
      changePortal('owner');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  // Cloud Pull Function (cross-device sync)
  const pullCloudData = async (showLoading = false) => {
    if (showLoading) setSyncStatus('syncing');
    try {
      const cloudData = await fetchServerGymData();
      if (cloudData && Array.isArray(cloudData.members)) {
        if (cloudData.lastUpdated > lastKnownServerTimestamp.current || lastKnownServerTimestamp.current === 0) {
          lastKnownServerTimestamp.current = cloudData.lastUpdated;
          setMembers(cloudData.members);
          saveToStorage(cloudData.members);
          if (cloudData.settings) {
            setSettings(cloudData.settings);
            saveGymSettings(cloudData.settings);
          }
        }
        if (Array.isArray(cloudData.users)) {
          const currentLocal = getStoredUsers();
          const merged = cloudData.users.map((u: any) => {
            const match = currentLocal.find(
              (l) => l.id === u.id || l.username.toLowerCase() === u.username.toLowerCase()
            );
            return match && match.password ? { ...u, password: match.password } : u;
          });
          saveStoredUsers(merged);
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('Cloud sync pull failed:', err);
      setSyncStatus('error');
    }
  };

  // Initial pull on mount & background polling for cross-device updates
  useEffect(() => {
    pullCloudData(true);

    // Continuous polling every 4 seconds to sync PC and Phone in real-time
    const intervalId = setInterval(() => {
      if (!document.hidden && !isPushing.current) {
        pullCloudData(false);
      }
    }, 4000);

    const onFocus = () => {
      pullCloudData(true);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Sync state to LocalStorage and push to Server when state changes
  useEffect(() => {
    saveToStorage(members);
    if (!isInitialMount.current) {
      isPushing.current = true;
      setSyncStatus('syncing');
      pushServerGymData(members, settings).then((success) => {
        isPushing.current = false;
        if (success) {
          lastKnownServerTimestamp.current = Date.now();
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          setSyncStatus('error');
        }
      });
    }
  }, [members]);

  useEffect(() => {
    saveGymSettings(settings);
    if (!isInitialMount.current) {
      isPushing.current = true;
      setSyncStatus('syncing');
      pushServerGymData(members, settings).then((success) => {
        isPushing.current = false;
        if (success) {
          lastKnownServerTimestamp.current = Date.now();
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      });
    } else {
      isInitialMount.current = false;
    }
  }, [settings]);

  // Current client member object
  const currentClientMember = (members && members.length > 0)
    ? (members.find((m) => m.id === clientMemberId) || members[0])
    : null;

  // Handlers
  const handleAddMember = (newMember: GymMember) => {
    setMembers((prev) => [newMember, ...prev]);
  };

  const handleRecordPayment = (
    memberId: string,
    amount: number,
    method: 'efectivo' | 'transferencia',
    note?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextDueDate = nextMonth.toISOString().split('T')[0];

    const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const formattedPeriod = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;

        const newPaymentRecord = {
          id: `pay_${Date.now()}`,
          date: today,
          amount,
          method,
          period: formattedPeriod,
          receiptNote: note || `Pago registrado por el gimnasio en ${method === 'efectivo' ? 'Efectivo' : 'Transferencia'}`,
        };

        return {
          ...m,
          paymentStatus: 'al_dia' as const,
          paymentMethod: method,
          lastPaymentDate: today,
          nextDueDate: nextDueDate,
          paymentsHistory: [newPaymentRecord, ...(m.paymentsHistory || [])],
          pendingPaymentApproval: undefined,
        };
      })
    );
  };

  const handleNotifyPayment = async (memberId: string, method: PaymentMethod, note?: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          pendingPaymentApproval: {
            requestedAt: new Date().toISOString(),
            method,
            note: note || `Aviso de pago por ${method === 'efectivo' ? 'Efectivo en recepción' : 'Transferencia bancaria'}`,
          },
        };
      })
    );
    // Instant server call for cross-device broadcast
    await serverNotifyPayment(memberId, method, note);
  };

  const handleApprovePayment = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const method = member.pendingPaymentApproval?.method || member.paymentMethod || 'efectivo';
    const amount = member.planPrice || 180000;
    const receiptNote = `Cobro verificado y aprobado por el gimnasio (${method === 'efectivo' ? 'Efectivo en recepción' : 'Transferencia bancaria'})`;

    handleRecordPayment(memberId, amount, method, receiptNote);
    // Instant server approval so student's routine unlocks immediately
    await serverApprovePayment(memberId, { amount, method, receiptNote });
  };

  const handleSendMessage = (memberId: string, message: GymMessage) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          messages: [message, ...(m.messages || [])],
        };
      })
    );
  };

  const handleUpdateMemberRoutines = async (memberId: string, routines: DailyWorkout[]) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          routines,
        };
      })
    );
    // Instant server routine update for student's phone
    await serverUpdateRoutine(memberId, routines);
  };

  // Client actions
  const handleClientUpdateWorkout = (routineId: string, updatedWorkout: DailyWorkout) => {
    if (!currentClientMember) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        const updatedRoutines = (m.routines || []).map((r) => (r.id === routineId ? updatedWorkout : r));
        return {
          ...m,
          routines: updatedRoutines,
        };
      })
    );
  };

  const handleClientCompleteWorkout = () => {
    if (!currentClientMember) return;
    const todayStr = new Date().toISOString().split('T')[0];

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        return {
          ...m,
          todayWorkoutCompleted: true,
          streakDays: (m.streakDays || 0) + 1,
          daysAbsent: 0,
          lastAttended: todayStr,
        };
      })
    );
  };

  const handleClientUpdateMood = (mood: 'energia' | 'cansado' | 'desmotivado' | 'adolorido') => {
    if (!currentClientMember) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        return {
          ...m,
          todayMood: mood,
        };
      })
    );
  };

  const handleClientAddWeight = (weight: WeightMetric) => {
    if (!currentClientMember) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        return {
          ...m,
          weightHistory: [...(m.weightHistory || []), weight],
        };
      })
    );
  };

  const handleClientAddPhoto = (photo: ProgressPhoto) => {
    if (!currentClientMember) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        return {
          ...m,
          photos: [photo, ...(m.photos || [])],
        };
      })
    );
  };

  const handleClientMarkMessagesRead = () => {
    if (!currentClientMember) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        return {
          ...m,
          messages: (m.messages || []).map((msg) => ({ ...msg, read: true })),
        };
      })
    );
  };

  const handleResetData = async () => {
    setSyncStatus('syncing');
    localStorage.removeItem('gymbro_app_data_v1');
    localStorage.removeItem('gymbro_registered_users_v2');
    const resetResult = await resetServerGymData();
    if (resetResult && resetResult.members) {
      setMembers(resetResult.members);
      setSettings(resetResult.settings);
      saveToStorage(resetResult.members);
      saveGymSettings(resetResult.settings);
    } else {
      setMembers([]);
      setSettings(DEFAULT_SETTINGS);
      saveToStorage([]);
      saveGymSettings(DEFAULT_SETTINGS);
    }
    setSyncStatus('synced');
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleUpdateSettings = (newSettings: GymSettings) => {
    setSettings(newSettings);
  };

  const handleRestoreMembers = (importedMembers: GymMember[], importedSettings?: GymSettings) => {
    setMembers(importedMembers);
    if (importedSettings) {
      setSettings(importedSettings);
    }
  };

  const handleResetToCleanState = async () => {
    setSyncStatus('syncing');
    localStorage.removeItem('gymbro_app_data_v1');
    localStorage.removeItem('gymbro_registered_users_v2');
    try {
      await fetch('/api/gym-data/clear-all', { method: 'POST' });
    } catch (e) {
      console.warn('Error clearing server state:', e);
    }
    setMembers([]);
    setSettings(DEFAULT_SETTINGS);
    saveToStorage([]);
    saveGymSettings(DEFAULT_SETTINGS);
    setSyncStatus('synced');
  };

  // 1. If not logged in: Request user & password (or registration)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <OfflineIndicator />
        <AuthScreen
          currentPortal={activePortal}
          onChangePortal={changePortal}
          onAuthSuccess={handleAuthSuccess}
          gymName={settings.gymName}
          onOpenLinksModal={() => setIsLinksModalOpen(true)}
        />
        <PortalLinksModal
          isOpen={isLinksModalOpen}
          onClose={() => setIsLinksModalOpen(false)}
          onNavigatePortal={(p) => changePortal(p)}
        />
        <GymBroMascot />
      </div>
    );
  }

  // Role mismatch handling when navigating via distinct links
  if (activePortal === 'trainer' && currentUser.role === 'student') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans p-4 items-center justify-center">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest font-mono">Link de Entrenadores</span>
            <h2 className="text-xl font-extrabold text-white">Portal de Entrenadores</h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Has ingresado al link para <strong>Entrenadores</strong>, pero tu sesión actual en este dispositivo es de <strong>Alumno ({currentUser.name})</strong>.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                handleLogout();
                changePortal('trainer');
              }}
              className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-neutral-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-400/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión e ingresar como Entrenador</span>
            </button>
            <button
              type="button"
              onClick={() => changePortal('student')}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all"
            >
              <span>Continuar en mi Rutina de Alumno</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePortal === 'owner' && currentUser.role !== 'owner') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans p-4 items-center justify-center">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest font-mono">Link de Administración</span>
            <h2 className="text-xl font-extrabold text-white">Panel del Dueño del Gimnasio</h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Has ingresado al link de <strong>Administración</strong>, pero tu sesión actual es de <strong>{currentUser.role === 'trainer' ? 'Entrenador' : 'Alumno'} ({currentUser.name})</strong>.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                handleLogout();
                changePortal('owner');
              }}
              className="w-full py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión e ingresar como Dueño</span>
            </button>
            <button
              type="button"
              onClick={() => changePortal(currentUser.role as any)}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all"
            >
              <span>Volver a mi Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. If student is logged in OR owner/trainer wants to preview student view
  if (currentUser.role === 'student' || (activePortal === 'student' && currentUser.role !== 'student')) {
    const isOwnerOrTrainerPreview = currentUser.role !== 'student';
    const activeStudent =
      members.find((m) => m.id === clientMemberId) ||
      members.find((m) => m.id === currentUser.memberId) ||
      (currentUser.role === 'student'
        ? ({
            id: currentUser.memberId || currentUser.id,
            name: currentUser.name,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            memberSince: 'Hoy',
            planName: 'Pase Libre Musculación',
            planPrice: 180000,
            paymentMethod: 'transferencia' as const,
            paymentStatus: 'pendiente' as const,
            nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            daysAbsent: 0,
            streakDays: 0,
            lastAttended: 'Hoy',
            goal: 'Acondicionamiento y Fuerza',
            injuriesNotes: 'Sin lesiones reportadas.',
            todayMood: 'energia' as const,
            todayWorkoutCompleted: false,
            paymentsHistory: [],
            routines: [],
            weightHistory: [],
            photos: [],
            messages: [],
          } as GymMember)
        : members[0]);

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <OfflineIndicator />

        {isOwnerOrTrainerPreview && (
          <div className="bg-cyan-500/15 border-b border-cyan-500/30 px-4 py-2 text-xs flex items-center justify-between text-cyan-300">
            <span>
              👀 <strong>Modo Vista de Alumno</strong> (Sesión activa de {currentUser.role === 'owner' ? 'Dueño' : 'Entrenador'}: {currentUser.name})
            </span>
            <button
              type="button"
              onClick={() => changePortal(currentUser.role as any)}
              className="px-2.5 py-1 rounded-lg bg-cyan-400 text-neutral-950 font-bold hover:bg-cyan-300"
            >
              Volver a mi Panel
            </button>
          </div>
        )}

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
          <ClientPortal
            currentMember={activeStudent}
            allMembers={members}
            onSelectMember={(id) => setClientMemberId(id)}
            onUpdateWorkout={handleClientUpdateWorkout}
            onCompleteWorkout={handleClientCompleteWorkout}
            onUpdateMood={handleClientUpdateMood}
            onAddWeight={handleClientAddWeight}
            onAddPhoto={handleClientAddPhoto}
            onMarkMessagesRead={handleClientMarkMessagesRead}
            onNotifyPayment={handleNotifyPayment}
            onLogout={handleLogout}
            allowSwitchingTrainees={isOwnerOrTrainerPreview}
            onOpenLinksModal={() => setIsLinksModalOpen(true)}
          />
        </main>
        <PortalLinksModal
          isOpen={isLinksModalOpen}
          onClose={() => setIsLinksModalOpen(false)}
          onNavigatePortal={(p) => changePortal(p)}
        />
        <GymBroMascot studentName={currentUser.name} />
      </div>
    );
  }

  // 3. If trainer is logged in OR owner visiting trainer portal
  if (currentUser.role === 'trainer' || (activePortal === 'trainer' && currentUser.role === 'owner')) {
    const isOwnerInTrainerMode = currentUser.role === 'owner';

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <OfflineIndicator />

        {isOwnerInTrainerMode && (
          <div className="bg-lime-400/15 border-b border-lime-400/30 px-4 py-2 text-xs flex items-center justify-between text-lime-300">
            <span>
              👑 <strong>Portal de Entrenadores</strong> (Acceso Administrativo de Dueño: {currentUser.name})
            </span>
            <button
              type="button"
              onClick={() => changePortal('owner')}
              className="px-2.5 py-1 rounded-lg bg-lime-400 text-neutral-950 font-bold hover:bg-lime-300"
            >
              Volver al Panel de Dueño
            </button>
          </div>
        )}

        <TrainerPortal
          currentUser={currentUser}
          members={members}
          onUpdateMemberRoutines={handleUpdateMemberRoutines}
          onLogout={handleLogout}
          onOpenMessageModal={(id) => {
            setMessageTargetMemberId(id);
            setMessageInitialType('support_motivational');
          }}
          onApprovePayment={handleApprovePayment}
          onOpenLinksModal={() => setIsLinksModalOpen(true)}
        />
        <PortalLinksModal
          isOpen={isLinksModalOpen}
          onClose={() => setIsLinksModalOpen(false)}
          onNavigatePortal={(p) => changePortal(p)}
        />
        <SendMessageModal
          isOpen={!!messageTargetMemberId}
          members={members}
          selectedMemberId={messageTargetMemberId || undefined}
          initialType={messageInitialType}
          onClose={() => {
            setMessageTargetMemberId(null);
            setMessageInitialType(undefined);
          }}
          onSendMessage={(memberId, message) => {
            handleSendMessage(memberId, message);
          }}
        />
        <GymBroMascot />
      </div>
    );
  }

  // 4. If owner is logged in: Owner-only Management Panel
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <OfflineIndicator />

      {/* Top Application Navigation Bar for Owner */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand & Domain link badge */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-lime-400/20 font-black shrink-0">
                <Dumbbell className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-white font-['Syne',sans-serif]">
                    {settings.gymName}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[10px] font-extrabold uppercase">
                    PRO
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLinksModalOpen(true)}
                    title="Ver enlaces de acceso separados"
                    className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-2 py-0.5 rounded-lg text-[11px] text-neutral-300 font-mono transition-colors"
                  >
                    <Globe className="w-3 h-3 text-lime-400" />
                    <span className="font-bold text-white">{typeof window !== 'undefined' ? `${window.location.host}/#/dueno` : 'gymbro.app/#/dueno'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 -mt-0.5 truncate max-w-xs">
                  {settings.tagline}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Sync + Logout */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                onClick={() => setIsLinksModalOpen(true)}
                title="Ver enlaces"
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-lime-400 hover:text-white"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => pullCloudData(true)}
                title="Sincronizar datos"
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-lime-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Controls: Cloud Sync, PWA Install, User Profile & Logout */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Share Links Button */}
            <button
              type="button"
              onClick={() => setIsLinksModalOpen(true)}
              id="btn-owner-share-links"
              title="Ver y compartir enlaces de acceso separados"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-lime-400 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-lime-400" />
              <span>Enlaces</span>
            </button>

            {/* Cloud Sync Status */}
            <button
              onClick={() => pullCloudData(true)}
              title={`Sincronizado con la nube (${lastSyncTime}). Clic para actualizar`}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                syncStatus === 'syncing'
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                  : syncStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-lime-400/10 border-lime-400/25 text-lime-400 hover:bg-lime-400/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Nube Sincronizada'}</span>
            </button>

            {/* PWA Install */}
            <PWAInstallButton />

            {/* Owner badge */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-neutral-400">Dueño:</span>
              <span className="font-bold text-white">{currentUser.name}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              id="btn-owner-logout"
              title="Cerrar sesión"
              className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/50 text-neutral-400 hover:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>

            {/* Reset data */}
            <button
              onClick={handleResetData}
              title="Restaurar datos iniciales"
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area for Owner */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">
          {/* Owner Navigation Sub-Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setOwnerTab('members')}
                id="tab-owner-members"
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                  ownerTab === 'members'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Alumnos ({members.length})</span>
              </button>

              <button
                onClick={() => setOwnerTab('routines')}
                id="tab-owner-routines"
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                  ownerTab === 'routines'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                <span>Rutinas Diarias</span>
              </button>

              <button
                onClick={() => setOwnerTab('payments')}
                id="tab-owner-payments"
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                  ownerTab === 'payments'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Control de Caja y Pagos</span>
              </button>

              <button
                onClick={() => setOwnerTab('messages')}
                id="tab-owner-messages"
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                  ownerTab === 'messages'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Avisos & Motivación IA</span>
              </button>

              <button
                onClick={() => setOwnerTab('commercial')}
                id="tab-owner-commercial"
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                  ownerTab === 'commercial'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Venta & Licencia (Descargar)</span>
              </button>
            </div>

            {/* Quick Action in Owner header */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewMemberOpen(true)}
                id="btn-owner-add-member"
                className="py-2 px-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nuevo Alumno</span>
              </button>
            </div>
          </div>

          {/* Owner Tab Panes */}
          {ownerTab === 'members' && (
            <MembersList
              members={members}
              onSelectMember={(m) => setDetailTargetMember(m)}
              onOpenPaymentModal={(id) => setPaymentTargetMemberId(id)}
              onOpenMessageModal={(id) => setMessageTargetMemberId(id)}
              onOpenNewMemberModal={() => setIsNewMemberOpen(true)}
              onOpenRoutinesManager={(m) => {
                setRoutineManagerTargetId(m.id);
                setOwnerTab('routines');
              }}
              onConfirmApprovePayment={handleApprovePayment}
              onOpenLinksModal={() => setIsLinksModalOpen(true)}
            />
          )}

          {ownerTab === 'routines' && (
            <RoutinesManager
              members={members}
              selectedMemberId={routineManagerTargetId}
              onUpdateMemberRoutines={handleUpdateMemberRoutines}
            />
          )}

          {ownerTab === 'payments' && (
            <PaymentsTracker
              members={members}
              onOpenPaymentModal={(id) => setPaymentTargetMemberId(id)}
              onOpenMessageModal={(id) => {
                setMessageTargetMemberId(id);
                setMessageInitialType('payment_reminder');
              }}
              onConfirmApprovePayment={handleApprovePayment}
            />
          )}

          {ownerTab === 'messages' && (
            <MessagingCenter
              members={members}
              onOpenMessageModal={(id, type) => {
                setMessageTargetMemberId(id || members[0]?.id);
                setMessageInitialType(type);
              }}
              onSendMessageDirect={handleSendMessage}
            />
          )}

          {ownerTab === 'commercial' && (
            <CommercialCenter
              settings={settings}
              members={members}
              onUpdateSettings={handleUpdateSettings}
              onRestoreMembers={handleRestoreMembers}
              onResetToCleanState={handleResetToCleanState}
            />
          )}
        </div>
      </main>

      {/* Floating Motivational GymBro Mascot */}
      <GymBroMascot />

      {/* Global Modals */}
      <NewMemberModal
        isOpen={isNewMemberOpen}
        onClose={() => setIsNewMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      <RecordPaymentModal
        isOpen={!!paymentTargetMemberId}
        members={members}
        selectedMemberId={paymentTargetMemberId || undefined}
        onClose={() => setPaymentTargetMemberId(null)}
        onSavePayment={(memberId, payment) => {
          handleRecordPayment(memberId, payment.amount, payment.method, payment.receiptNote);
        }}
      />

      <SendMessageModal
        isOpen={!!messageTargetMemberId}
        members={members}
        selectedMemberId={messageTargetMemberId || undefined}
        initialType={messageInitialType}
        onClose={() => {
          setMessageTargetMemberId(null);
          setMessageInitialType(undefined);
        }}
        onSendMessage={(memberId, message) => {
          handleSendMessage(memberId, message);
        }}
      />

      <MemberDetailModal
        isOpen={!!detailTargetMember}
        member={detailTargetMember}
        onClose={() => setDetailTargetMember(null)}
        onOpenPayment={(id) => setPaymentTargetMemberId(id)}
        onOpenMessage={(id) => setMessageTargetMemberId(id)}
        onOpenRoutine={(m) => {
          setRoutineManagerTargetId(m.id);
          setOwnerTab('routines');
        }}
      />

      <PortalLinksModal
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
        onNavigatePortal={(p) => changePortal(p)}
        onDataReset={() => {
          setMembers([]);
          pullCloudData(true);
        }}
        onUserCreated={() => {
          pullCloudData(true);
        }}
      />
    </div>
  );
}
