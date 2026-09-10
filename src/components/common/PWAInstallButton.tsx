import React, { useState } from 'react';
import { Download, Sparkles, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed in standalone mode, show clean installed badge or hide
  if (isInstalled) {
    if (variant === 'badge') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <Check className="w-3.5 h-3.5" />
          <span>App Instalada</span>
        </span>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        id="btn-pwa-install"
        title="Instalar GymBro en tu dispositivo"
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-lime-500 text-neutral-950 px-3.5 py-1.5 text-xs font-black shadow-md shadow-lime-400/20 hover:from-lime-300 hover:to-lime-400 transition-all cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        <span>Instalar App</span>
        {isInstallable && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-950 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-950"></span>
          </span>
        )}
      </button>

      <InstallAppModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onTriggerInstall={install}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </>
  );
};
