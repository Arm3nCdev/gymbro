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
} from 'lucide-react';
import { DailyWorkout, GymMember, GymMessage, ProgressPhoto, WeightMetric, GymSettings, OwnerViewTab } from './types';
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
} from './utils/storage';

// Owner Components
import { MembersList } from './components/owner/MembersList';
import { PaymentsTracker } from './components/owner/PaymentsTracker';
import { RoutinesManager } from './components/owner/RoutinesManager';
import { MessagingCenter } from './components/owner/MessagingCenter';
import { MemberDetailModal } from './components/owner/MemberDetailModal';
import { CommercialCenter } from './components/owner/CommercialCenter';

// Client Components
import { ClientPortal } from './components/client/ClientPortal';

// Common Components
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Modals
import { NewMemberModal } from './components/modals/NewMemberModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { SendMessageModal } from './components/modals/SendMessageModal';

export default function App() {
  // Gym Settings & Branding
  const [settings, setSettings] = useState<GymSettings>(() => loadGymSettings());

  // Members State
  const [members, setMembers] = useState<GymMember[]>(() => {
    return loadFromStorage(INITIAL_MEMBERS);
  });

  // Cloud Sync State for real-time Notebook/PC <-> Phone synchronization
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Reciente');
  const isInitialMount = useRef(true);
  const lastKnownServerTimestamp = useRef<number>(0);
  const isPushing = useRef(false);

  // Role View: 'owner' (PC/Notebook Gym Manager) or 'client' (Mobile/Athlete App)
  const [activeRole, setActiveRole] = useState<'owner' | 'client'>('owner');

  // Owner Sub-tabs: 'members' | 'routines' | 'payments' | 'messages' | 'commercial'
  const [ownerTab, setOwnerTab] = useState<OwnerViewTab>('members');

  // Client Selected Member ID (default to first member)
  const [clientMemberId, setClientMemberId] = useState<string>(() => {
    return (members && members[0]?.id) || 'mem_1';
  });

  // Modals state
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [paymentTargetMemberId, setPaymentTargetMemberId] = useState<string | null>(null);
  const [messageTargetMemberId, setMessageTargetMemberId] = useState<string | null>(null);
  const [messageInitialType, setMessageInitialType] = useState<any>(undefined);
  const [detailTargetMember, setDetailTargetMember] = useState<GymMember | null>(null);
  const [routineManagerTargetId, setRoutineManagerTargetId] = useState<string | undefined>(undefined);

  // Cloud Pull Function (cross-device sync)
  const pullCloudData = async (showLoading = false) => {
    if (showLoading) setSyncStatus('syncing');
    try {
      const cloudData = await fetchServerGymData();
      if (cloudData && cloudData.members && cloudData.members.length > 0) {
        if (cloudData.lastUpdated > lastKnownServerTimestamp.current) {
          lastKnownServerTimestamp.current = cloudData.lastUpdated;
          setMembers(cloudData.members);
          saveToStorage(cloudData.members);
          if (cloudData.settings) {
            setSettings(cloudData.settings);
            saveGymSettings(cloudData.settings);
          }
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
        };
      })
    );
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

  const handleUpdateMemberRoutines = (memberId: string, routines: DailyWorkout[]) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          routines,
        };
      })
    );
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
    const resetResult = await resetServerGymData();
    if (resetResult && resetResult.members) {
      setMembers(resetResult.members);
      setSettings(resetResult.settings);
      saveToStorage(resetResult.members);
      saveGymSettings(resetResult.settings);
    } else {
      setMembers(INITIAL_MEMBERS);
      setSettings(DEFAULT_SETTINGS);
      saveToStorage(INITIAL_MEMBERS);
      saveGymSettings(DEFAULT_SETTINGS);
      await pushServerGymData(INITIAL_MEMBERS, DEFAULT_SETTINGS);
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

  const handleResetToCleanState = () => {
    setMembers(INITIAL_MEMBERS);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <OfflineIndicator />

      {/* Top Application Navigation Bar */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand & Sync Status */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
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
                </div>
                <p className="text-[11px] text-neutral-400 -mt-0.5 truncate max-w-xs">
                  {settings.tagline}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Cloud Sync + Role Switcher */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                onClick={() => pullCloudData(true)}
                title="Sincronizar datos con la PC"
                className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
                  syncStatus === 'syncing'
                    ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-lime-400' : 'text-lime-400'}`} />
              </button>
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setActiveRole('owner')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeRole === 'owner' ? 'bg-lime-400 text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  Dueño
                </button>
                <button
                  onClick={() => setActiveRole('client')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeRole === 'client' ? 'bg-lime-400 text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  Alumno
                </button>
              </div>
            </div>
          </div>

          {/* Center / Right: Real-time Cloud Sync + PWA Install + Role Toggle for Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Real-time Cloud Sync Badge & Button */}
            <button
              onClick={() => pullCloudData(true)}
              title={`Sincronizado con la nube (${lastSyncTime}). Clic para actualizar ahora`}
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

            {/* Direct PWA Install Button */}
            <PWAInstallButton />

            {/* View switcher pills */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 p-1 rounded-2xl">
              <button
                onClick={() => setActiveRole('owner')}
                id="role-toggle-owner"
                className={`flex items-center gap-2 py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  activeRole === 'owner'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>Panel Dueño (PC / Gym)</span>
              </button>

              <button
                onClick={() => setActiveRole('client')}
                id="role-toggle-client"
                className={`flex items-center gap-2 py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  activeRole === 'client'
                    ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Vista Alumno (Celular)</span>
              </button>
            </div>

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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeRole === 'owner' ? (
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
                  <span>Socios ({members.length})</span>
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
                  <span>Nuevo Socio</span>
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
        ) : (
          /* Client Mobile / Trainee Portal */
          <div className="py-2">
            <ClientPortal
              currentMember={currentClientMember}
              allMembers={members}
              onSelectMember={(id) => setClientMemberId(id)}
              onUpdateWorkout={handleClientUpdateWorkout}
              onCompleteWorkout={handleClientCompleteWorkout}
              onUpdateMood={handleClientUpdateMood}
              onAddWeight={handleClientAddWeight}
              onAddPhoto={handleClientAddPhoto}
              onMarkMessagesRead={handleClientMarkMessagesRead}
            />
          </div>
        )}
      </main>

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
    </div>
  );
}
