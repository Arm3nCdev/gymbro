import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-status-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-neutral-950 shadow-xl border border-amber-400/50 animate-bounce"
    >
      <WifiOff className="w-4 h-4 text-neutral-950" />
      <span>Modo Offline — Tus rutinas y cambios se guardan localmente</span>
    </div>
  );
};
