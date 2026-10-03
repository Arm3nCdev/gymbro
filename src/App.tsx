import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Users,
  CreditCard,
  MessageSquare,
  Smartphone,
  Laptop,
  Plus,
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
  loadGymMembers,
  saveToStorage,
  loadGymSettings,
  saveGymSettings,
  DEFAULT_SETTINGS,
  fetchServerGymData,
  pushServerGymData,
  serverNotifyPayment,
  serverApprovePayment,
  serverUpdateRoutine,
} from './utils/storage';
import {
  getCurrentAuthUser,
  validateAuthSession,
  saveAuthSession,
  logoutUser,
  getStoredUsers,
  saveStoredUsers,
  updateUserProfile,
  getPortalFromLocation,
} from './utils/auth';

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
import { UserProfileModal } from './components/common/UserProfileModal';

// Modals
import { NewMemberModal } from './components/modals/NewMemberModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { SendMessageModal } from './components/modals/SendMessageModal';

const getInitialPortal = getPortalFromLocation;

export default function App() {
  // Active Portal routing ('student' | 'trainer' | 'owner')
  const [activePortal, setActivePortal] = useState<'student' | 'trainer' | 'owner'>(getInitialPortal);

  // Authentication State strictly validated for active portal (100% internal, no Google dependencies)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const initial = getInitialPortal();
    const validated = validateAuthSession(initial);
    return validated.isValid ? validated.user : null;
  });
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);

  const changePortal = (p: 'student' | 'trainer' | 'owner') => {
    setActivePortal(p);
    const targetHash = p === 'owner' ? '#/dueno' : p === 'trainer' ? '#/coach' : '#/alumno';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    const validated = validateAuthSession(p);
    setCurrentUser(validated.isValid ? validated.user : null);
  };

  // Sync portal state if user navigates via browser address, back/forward, or history
  useEffect(() => {
    const handleUrlChange = () => {
      const p = getInitialPortal();
      setActivePortal(p);
      const validated = validateAuthSession(p);
      setCurrentUser(validated.isValid ? validated.user : null);
      if (validated.isValid && validated.user?.role === 'student' && validated.user.memberId) {
        setClientMemberId(validated.user.memberId);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    // Initial URL normalization without full page reload
    const current = getInitialPortal();
    const expectedHash = current === 'owner' ? '#/dueno' : current === 'trainer' ? '#/coach' : '#/alumno';
    if (!window.location.hash || window.location.hash === '#/') {
      window.history.replaceState(null, '', expectedHash);
    }

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Update currentUser whenever activePortal changes so portals are 100% isolated
  useEffect(() => {
    const validated = validateAuthSession(activePortal);
    setCurrentUser(validated.isValid ? validated.user : null);
    if (validated.isValid && validated.user?.role === 'student' && validated.user.memberId) {
      setClientMemberId(validated.user.memberId);
    }
  }, [activePortal]);

  // Gym Settings & Branding
  const [settings, setSettings] = useState<GymSettings>(() => loadGymSettings());

  // Members State (Initialized with rich seed or persisted data)
  const [members, setMembers] = useState<GymMember[]>(() => {
    return loadGymMembers();
  });

  // Cloud Sync State for real-time Notebook/PC <-> Phone synchronization
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Reciente');
  const isInitialMount = useRef(true);
  const lastKnownServerTimestamp = useRef<number>(0);
  const isPushing = useRef(false);
  const isPullingRef = useRef(false);
  const membersJsonRef = useRef<string>(JSON.stringify(members));
  const settingsJsonRef = useRef<string>(JSON.stringify(settings));

  // Owner Sub-tabs: 'members' | 'routines' | 'payments' | 'messages' | 'commercial'
  const [ownerTab, setOwnerTab] = useState<OwnerViewTab>('members');

  // Client Selected Member ID (matches logged-in student or default)
  const [clientMemberId, setClientMemberId] = useState<string>(() => {
    const savedUser = getCurrentAuthUser('student');
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Update profile handler for all roles (student, trainer, owner)
  const handleUpdateProfile = async (data: {
    userId: string;
    name: string;
    avatar: string;
    birthDate?: string;
    bio: string;
    description?: string;
    phone?: string;
    email?: string;
    specialty?: string;
    goal?: string;
  }) => {
    try {
      const res = await updateUserProfile(data);
      if (res.success && res.user) {
        setCurrentUser((prev) => (prev ? { ...prev, ...res.user } : res.user!));

        // Update matching member in state if student
        setMembers((prev) =>
          prev.map((m) => {
            const isMatch = m.id === res.user?.memberId || m.id === data.userId || m.name === res.user?.name;
            if (isMatch) {
              return {
                ...m,
                name: data.name,
                avatar: data.avatar,
                birthDate: data.birthDate !== undefined ? data.birthDate : m.birthDate,
                bio: data.bio,
                description: data.description || data.bio,
                phone: data.phone || m.phone,
                email: data.email || m.email,
                goal: data.goal || m.goal,
              };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error('Error updating profile in App:', err);
    }
  };

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
    saveAuthSession(user, user.role);
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
    void logoutUser(activePortal);
    setCurrentUser(null);
  };

  // Cloud Pull Function (cross-device sync - silent background polling without flicker or jumps)
  const pullCloudData = async (showLoading = false) => {
    if (showLoading) setSyncStatus('syncing');
    try {
      const cloudData = await fetchServerGymData();
      if (cloudData && Array.isArray(cloudData.members)) {
        const incomingMembersJson = JSON.stringify(cloudData.members);
        const incomingSettingsJson = cloudData.settings ? JSON.stringify(cloudData.settings) : '';

        const membersChanged = incomingMembersJson !== membersJsonRef.current;
        const settingsChanged = cloudData.settings && incomingSettingsJson !== settingsJsonRef.current;

        // Only update React state if server data actually changed!
        if (membersChanged || settingsChanged) {
          isPullingRef.current = true;
          if (membersChanged) {
            membersJsonRef.current = incomingMembersJson;
            setMembers(cloudData.members);
            saveToStorage(cloudData.members);
          }
          if (settingsChanged && cloudData.settings) {
            settingsJsonRef.current = incomingSettingsJson;
            setSettings(cloudData.settings);
            saveGymSettings(cloudData.settings);
          }
          lastKnownServerTimestamp.current = cloudData.lastUpdated;
          setTimeout(() => {
            isPullingRef.current = false;
          }, 200);
        }

        if (Array.isArray(cloudData.users)) {
          // Each portal only receives the users it may see, so merge instead of replacing:
          // another portal open in this browser must keep its own account cached.
          const currentLocal = getStoredUsers();
          const merged = cloudData.users.map((u: any) => {
            const match = currentLocal.find(
              (l) => l.id === u.id || l.username.toLowerCase() === u.username.toLowerCase()
            );
            return match && match.password ? { ...u, password: match.password } : u;
          });
          const untouched = currentLocal.filter((l) => !merged.some((u: any) => u.id === l.id));
          saveStoredUsers([...merged, ...untouched]);
        }

        if (showLoading) {
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        if (showLoading) setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('Cloud sync pull failed:', err);
      if (showLoading) setSyncStatus('error');
    }
  };

  // Initial pull on mount & background polling for cross-device updates
  useEffect(() => {
    pullCloudData(false);

    // Continuous polling every 8 seconds to sync PC and Phone quietly without moving screen or draining mobile battery
    const intervalId = setInterval(() => {
      if (!document.hidden && !isPushing.current && !isPullingRef.current) {
        pullCloudData(false);
      }
    }, 8000);

    const onFocus = () => {
      pullCloudData(false);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Sync state to LocalStorage and push to Server when state changes locally
  useEffect(() => {
    saveToStorage(members);
    const newJson = JSON.stringify(members);
    if (isInitialMount.current) {
      membersJsonRef.current = newJson;
      return;
    }

    if (isPullingRef.current) {
      return;
    }

    if (newJson !== membersJsonRef.current) {
      membersJsonRef.current = newJson;
      isPushing.current = true;
      pushServerGymData(members, settings).then((success) => {
        isPushing.current = false;
        if (success) {
          lastKnownServerTimestamp.current = Date.now();
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setSyncStatus('error');
        }
      });
    }
  }, [members]);

  useEffect(() => {
    saveGymSettings(settings);
    const newJson = JSON.stringify(settings);
    if (isInitialMount.current) {
      isInitialMount.current = false;
      settingsJsonRef.current = newJson;
      return;
    }

    if (isPullingRef.current) {
      return;
    }

    if (newJson !== settingsJsonRef.current) {
      settingsJsonRef.current = newJson;
      isPushing.current = true;
      pushServerGymData(members, settings).then((success) => {
        isPushing.current = false;
        if (success) {
          lastKnownServerTimestamp.current = Date.now();
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      });
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
    note?: string,
    period?: string,
    paymentDate?: string
  ) => {
    const today = paymentDate || new Date().toISOString().split('T')[0];
    const nextMonth = new Date(`${today}T12:00:00`);
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextDueDate = nextMonth.toISOString().split('T')[0];

    const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const formattedPeriod = period || currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

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

  const handleClientMarkMessagesRead = (messageId?: string) => {
    if (!currentClientMember) return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentClientMember.id) return m;
        return {
          ...m,
          messages: (m.messages || []).map((msg) =>
            !messageId || msg.id === messageId ? { ...msg, read: true } : msg
          ),
        };
      })
    );
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
        />
        <GymBroMascot />
      </div>
    );
  }

  // 2. Student Portal
  if (activePortal === 'student') {
    const activeStudent =
      members.find((m) => m.id === clientMemberId) ||
      members.find((m) => m.id === currentUser.memberId) ||
      (currentUser.role === 'student'
        ? ({
            id: currentUser.memberId || currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
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
            allowSwitchingTrainees={false}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        </main>
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          currentMember={activeStudent}
          onUpdateProfile={handleUpdateProfile}
        />
        <GymBroMascot
          studentName={currentUser.name}
          member={activeStudent}
          unreadMessages={activeStudent?.messages?.filter((m) => !m.read)}
          onMarkMessageRead={(id) => handleClientMarkMessagesRead(id)}
        />
      </div>
    );
  }

  // 3. Trainer Portal
  if (activePortal === 'trainer') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <OfflineIndicator />

        <TrainerPortal
          currentUser={currentUser}
          members={members}
          onUpdateMemberRoutines={handleUpdateMemberRoutines}
          onLogout={handleLogout}
          onOpenMessageModal={(id, type) => {
            setMessageTargetMemberId(id);
            setMessageInitialType(type || 'absent_funny');
          }}
          onApprovePayment={handleApprovePayment}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateProfile={handleUpdateProfile}
        />
        <SendMessageModal
          key={`msg_${messageTargetMemberId || 'closed'}_${messageInitialType || ''}`}
          isOpen={!!messageTargetMemberId}
          members={members}
          selectedMemberId={messageTargetMemberId || undefined}
          initialType={messageInitialType}
          senderRole="trainer"
          senderName={currentUser.name}
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

            {/* Mobile Actions: Profile, Sync + Logout */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                title="Modificar mi perfil"
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-lime-400 hover:text-white"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
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
            {/* Owner Profile Button */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              id="btn-owner-edit-profile"
              title="Modificar mi foto, descripción y datos de dueño"
              className="py-1.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20 active:scale-95 whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mi Perfil</span>
            </button>

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
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all min-w-[145px] whitespace-nowrap ${
                syncStatus === 'syncing'
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                  : syncStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-lime-400/10 border-lime-400/25 text-lime-400 hover:bg-lime-400/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Nube Sincronizada'}</span>
            </button>

            {/* PWA Install */}
            <PWAInstallButton />

            {/* Owner badge */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 pl-1.5 pr-3 py-1 rounded-xl text-xs">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-lg object-cover border border-lime-400/50"
              />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-neutral-400 leading-tight">Dueño:</span>
                <span className="font-bold text-white leading-tight">{currentUser.name}</span>
              </div>
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

      {/* Keyed by member so the form resets every time it opens for someone else */}
      <RecordPaymentModal
        key={`pay_${paymentTargetMemberId || 'closed'}`}
        isOpen={!!paymentTargetMemberId}
        members={members}
        selectedMemberId={paymentTargetMemberId || undefined}
        gymName={settings.gymName}
        onClose={() => setPaymentTargetMemberId(null)}
        onSavePayment={(memberId, payment) => {
          handleRecordPayment(memberId, payment.amount, payment.method, payment.receiptNote, payment.period, payment.date);
        }}
      />

      <SendMessageModal
        key={`msg_${messageTargetMemberId || 'closed'}_${messageInitialType || ''}`}
        isOpen={!!messageTargetMemberId}
        members={members}
        selectedMemberId={messageTargetMemberId || undefined}
        initialType={messageInitialType}
        senderRole="owner"
        senderName={currentUser.name}
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
        onUserCreated={() => {
          pullCloudData(true);
        }}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
      />
    </div>
  );
}
