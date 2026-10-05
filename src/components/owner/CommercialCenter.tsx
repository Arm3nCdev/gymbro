import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Upload,
  Building2,
  Smartphone,
  Laptop,
  QrCode,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Coins,
  RefreshCw,
  FileSpreadsheet,
  Share2,
  ExternalLink,
  DollarSign,
  Phone,
  MapPin,
  HelpCircle,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { GymMember, GymSettings } from '../../types';
import { GymLogo, resizeLogo } from '../common/GymLogo';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from '../common/InstallAppModal';
import { tenantBaseUrl } from '../../utils/tenant';

interface CommercialCenterProps {
  settings: GymSettings;
  members: GymMember[];
  onUpdateSettings: (newSettings: GymSettings) => void;
  onRestoreMembers: (importedMembers: GymMember[], importedSettings?: GymSettings) => void;
}

export const CommercialCenter: React.FC<CommercialCenterProps> = ({
  settings,
  members,
  onUpdateSettings,
  onRestoreMembers,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formData, setFormData] = useState<GymSettings>(settings);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setLogoError(null);
    try {
      setFormData((prev) => ({ ...prev, logoUrl: undefined }));
      const logoUrl = await resizeLogo(file);
      setFormData((prev) => ({ ...prev, logoUrl }));
    } catch (err: any) {
      setLogoError(err?.message || 'No se pudo cargar el logo.');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const cloudAppUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
    ? tenantBaseUrl()
    : 'https://gymbro.app';

  const [localQrUrl, setLocalQrUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(cloudAppUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setLocalQrUrl(url))
      .catch((err) => console.error('Error generating commercial QR:', err));
  }, [cloudAppUrl]);

  const handleCopyAppUrl = () => {
    navigator.clipboard.writeText(cloudAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Stats calculation
  const totalRecaudado = members.reduce((acc, m) => {
    return acc + m.paymentsHistory.reduce((sum, p) => sum + p.amount, 0);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Hero Banner: Commercial & Download Hub */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Configuración del Gimnasio</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Syne',sans-serif]">
              Tu gimnasio en la compu de recepción y en cada celular
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Instalá la app en las computadoras de recepción (Windows/Mac) y compartí el acceso con tus socios y profes (Android/iOS). Configurá el nombre, el logo y los datos de contacto de tu gimnasio.
            </p>
          </div>

          {/* Quick Install Action Button */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => {
                if (isInstallable) {
                  install();
                } else {
                  setShowInstallModal(true);
                }
              }}
              id="btn-commercial-install-pwa"
              className="px-6 py-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-lime-400/25 hover:scale-[1.02] cursor-pointer"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>{isInstalled ? 'Ver Guía de Instalación' : 'Instalar en este Dispositivo'}</span>
            </button>

          </div>
        </div>
      </div>

      {/* Grid: 3 Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Branding & Gym Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gym Settings Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Identidad del Gimnasio (Marca Blanca)</h3>
                  <p className="text-xs text-neutral-400">Personaliza los datos que ven tus socios y se imprimen en recibos</p>
                </div>
              </div>

              {isSavedNotice && (
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardado</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Company logo (separate from the owner's profile photo) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <GymLogo logoUrl={formData.logoUrl} name={formData.gymName} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-neutral-300">Logo de la Empresa</div>
                  <p className="text-[11px] text-neutral-500">
                    Aparece en la esquina de los portales del dueño, profes y alumnos. Es independiente de tu foto de perfil.
                    PNG con fondo transparente o JPG cuadrado.
                  </p>
                  {logoError && <p className="text-[11px] text-rose-400 mt-1">{logoError}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFile} className="hidden" />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    id="btn-upload-gym-logo"
                    className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-lime-400" />
                    {formData.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: undefined })}
                      className="py-2 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs font-bold"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              {formData.logoUrl !== settings.logoUrl && (
                <p className="text-[11px] text-amber-300 -mt-2">Tocá "Guardar Datos del Gimnasio" para aplicar el logo.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Nombre Comercial del Gimnasio
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.gymName}
                    onChange={(e) => setFormData({ ...formData, gymName: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 transition-colors"
                    placeholder="Ej. IronFit Gym, Sparta Club..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Slogan o Frase Motivacional
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 transition-colors"
                    placeholder="Ej. Donde nacen los campeones"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    WhatsApp de Contacto / Avisos
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 transition-colors"
                    placeholder="+595 981 123456 ó +54 9 11 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Nombre del Dueño o Administrador
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 transition-colors"
                    placeholder="Prof. Martín Gómez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Dirección Física del Local
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 transition-colors"
                    placeholder="Av. Mariscal López 1250, Asunción"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Símbolo de Moneda
                  </label>
                  <select
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400 transition-colors"
                  >
                    <option value="₲">₲ (Guaraníes - Paraguay)</option>
                    <option value="$">$ (Pesos / Dólares)</option>
                    <option value="USD $">USD $ (Dólar Americano)</option>
                    <option value="€">€ (Euros)</option>
                    <option value="S/.">S/. (Soles)</option>
                    <option value="R$">R$ (Reales)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  id="btn-save-gym-settings"
                  className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-md shadow-lime-400/20"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Guardar Datos del Gimnasio</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Column 3: Commercial Pitch & Share QR */}
        <div className="space-y-6">
          {/* Share App with Athletes */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Acceso para Alumnos</h3>
                <p className="text-[11px] text-neutral-400">Enlace para que los clientes instalen la app</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
              {/* Real Scannable QR Code */}
              <div className="inline-block p-3 rounded-2xl bg-white shadow-lg border border-neutral-200">
                {localQrUrl ? (
                  <img
                    src={localQrUrl}
                    alt="QR Code GymBro"
                    className="w-36 h-36 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-neutral-400 text-xs font-mono">
                    Generando QR...
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-300 font-medium">
                Pega este QR o comparte el enlace para que tus socios y clientes abran e instalen GymBro en 10 segundos.
              </p>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 px-3">
                <input
                  type="text"
                  readOnly
                  value={cloudAppUrl}
                  className="bg-transparent text-[11px] text-neutral-300 w-full outline-none font-mono select-all text-center"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopyAppUrl}
                  id="btn-copy-gym-url"
                  className="w-full py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-lime-400/20"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>¡Enlace Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Enlace para Alumnos</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `¡Hola! Acá tenés el acceso al sistema GymBro para abrir en tu celular o notebook, ver tus rutinas y registrar tu progreso: ${cloudAppUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-commercial-whatsapp-share"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartir por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onTriggerInstall={install}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </div>
  );
};
