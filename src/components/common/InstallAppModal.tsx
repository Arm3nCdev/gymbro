import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  CheckCircle2,
  X,
  Share,
  PlusSquare,
  ShieldCheck,
  Wifi,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Share2
} from 'lucide-react';
import { tenantBaseUrl } from '../../utils/tenant';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall?: () => Promise<boolean>;
  isInstallable?: boolean;
  isInstalled?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onTriggerInstall,
  isInstallable,
  isInstalled,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Dynamically use current live origin so it works immediately in new tab
  const cloudAppUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
    ? tenantBaseUrl()
    : 'https://gymbro.app';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(cloudAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `¡Hola! Acá tenés el acceso a GymBro para abrir en tu celular o notebook, ver tus rutinas y registrar tu progreso: ${cloudAppUrl}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-install-modal"
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-lime-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-lime-400/25 font-black shrink-0">
            <Download className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne',sans-serif]">
                Instalar & Compartir GymBro
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 border border-lime-400/30 text-[10px] font-black uppercase tracking-wider">
                Cloud 24/7
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">
              Acceso multiplataforma: funciona en cualquier celular, notebook o tablet sin depender de tu computadora.
            </p>
          </div>
        </div>

        {/* Cloud URL Public Box */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-lime-950/40 via-neutral-950 to-neutral-950 border border-lime-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-lime-400">
              <Globe className="w-4 h-4" />
              <span>URL Oficial del Sistema en la Nube</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              ● En Vivo 24/7
            </span>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 px-3">
            <input
              type="text"
              readOnly
              value={cloudAppUrl}
              className="bg-transparent text-xs text-neutral-200 w-full outline-none font-mono select-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleCopyUrl}
              id="btn-modal-copy-cloud-url"
              className="py-2 px-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>¡URL Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar URL</span>
                </>
              )}
            </button>

            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-modal-whatsapp-share"
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar por WhatsApp</span>
            </a>

            <a
              href={cloudAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-modal-open-newtab"
              className="py-2 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-neutral-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en nueva pestaña</span>
            </a>
          </div>

          <p className="text-[11px] text-neutral-400 leading-normal pt-1">
            Esta URL está alojada en servidores de alta disponibilidad 24/7 en la nube. Cualquier persona que tenga este enlace puede acceder desde su notebook, celular o tablet en cualquier momento.
          </p>
        </div>

        {/* Status banner */}
        {isInstalled ? (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-300">¡App ya instalada!</h4>
              <p className="text-xs text-neutral-300">
                GymBro ya está funcionando como aplicación en este dispositivo.
              </p>
            </div>
          </div>
        ) : isInstallable && onTriggerInstall ? (
          <div className="mb-6 p-4 rounded-2xl bg-lime-400/10 border border-lime-400/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-lime-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Instalación automática disponible</h4>
                <p className="text-xs text-neutral-400">
                  Tu navegador permite instalar la app con 1 clic directo.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                const res = await onTriggerInstall();
                if (res) onClose();
              }}
              id="btn-direct-install-pwa"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Ahora</span>
            </button>
          </div>
        ) : null}

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <Wifi className="w-5 h-5 text-lime-400 mb-2" />
            <h5 className="text-xs font-bold text-white">Funciona Offline</h5>
            <p className="text-[11px] text-neutral-400 mt-1">
              Rutinas y registros accesibles aun sin señal en el gimnasio.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <Smartphone className="w-5 h-5 text-lime-400 mb-2" />
            <h5 className="text-xs font-bold text-white">Experiencia Nativa</h5>
            <p className="text-[11px] text-neutral-400 mt-1">
              Sin barras de navegador, con icono en tu pantalla de inicio.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <ShieldCheck className="w-5 h-5 text-lime-400 mb-2" />
            <h5 className="text-xs font-bold text-white">100% Seguro y Privado</h5>
            <p className="text-[11px] text-neutral-400 mt-1">
              Base de datos local ultrarrápida sin suscripciones forzadas.
            </p>
          </div>
        </div>

        {/* Device Step-by-Step Tabs / Guides */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Instrucciones de instalación según tu equipo:
        </h3>

        <div className="space-y-3">
          {/* Android / Chrome */}
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="flex items-center gap-2.5 mb-2">
              <Smartphone className="w-4 h-4 text-lime-400" />
              <h4 className="text-sm font-bold text-white">Android (Google Chrome / Edge / Brave)</h4>
            </div>
            <ol className="text-xs text-neutral-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Abre esta página en <strong>Google Chrome</strong> en tu móvil.</li>
              <li>Toca el menú de <strong>tres puntos (⋮)</strong> en la esquina superior derecha.</li>
              <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</li>
              <li>¡Listo! El icono de GymBro aparecerá en tus aplicaciones.</li>
            </ol>
          </div>

          {/* iOS iPhone / iPad */}
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="flex items-center gap-2.5 mb-2">
              <Apple className="w-4 h-4 text-neutral-200" />
              <h4 className="text-sm font-bold text-white">iPhone y iPad (Safari)</h4>
            </div>
            <ol className="text-xs text-neutral-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Abre este sitio en el navegador <strong>Safari</strong> de iOS.</li>
              <li>
                Presiona el botón <span className="inline-flex items-center gap-1 font-bold text-lime-400"><Share className="w-3.5 h-3.5 inline" /> Compartir</span> en la barra inferior.
              </li>
              <li>
                Desliza hacia abajo y presiona <span className="inline-flex items-center gap-1 font-bold text-lime-400"><PlusSquare className="w-3.5 h-3.5 inline" /> "Agregar al inicio"</span>.
              </li>
              <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</li>
            </ol>
          </div>

          {/* PC / Notebook Windows / Mac */}
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="flex items-center gap-2.5 mb-2">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Computadora / Notebook (Windows, Mac, Linux)</h4>
            </div>
            <ol className="text-xs text-neutral-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Abre esta web en <strong>Chrome, Edge o Brave</strong> en tu PC.</li>
              <li>
                Haz clic en el icono de instalación <Download className="w-3.5 h-3.5 inline text-lime-400" /> situado en la <strong>barra de direcciones URL</strong> a la derecha.
              </li>
              <li>O abre el menú del navegador y elige <strong>"Instalar GymBro..."</strong>.</li>
              <li>Se creará un acceso directo en tu escritorio y barra de tareas para abrir con 1 clic.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors"
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
