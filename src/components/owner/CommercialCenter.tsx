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
import { exportGymDataBackup, importGymDataBackup } from '../../utils/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from '../common/InstallAppModal';

interface CommercialCenterProps {
  settings: GymSettings;
  members: GymMember[];
  onUpdateSettings: (newSettings: GymSettings) => void;
  onRestoreMembers: (importedMembers: GymMember[], importedSettings?: GymSettings) => void;
  onResetToCleanState: () => void;
}

export const CommercialCenter: React.FC<CommercialCenterProps> = ({
  settings,
  members,
  onUpdateSettings,
  onRestoreMembers,
  onResetToCleanState,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formData, setFormData] = useState<GymSettings>(settings);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const cloudAppUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
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

  const handleExportBackup = () => {
    exportGymDataBackup(members, settings);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importGymDataBackup(content);
      if (result.success && result.members) {
        onRestoreMembers(result.members, result.settings);
        setImportStatus(`¡Restauración exitosa! Se cargaron ${result.members.length} socios.`);
        if (result.settings) {
          setFormData(result.settings);
        }
      } else {
        setImportStatus(`Error al importar: ${result.error}`);
      }
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
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
              <span>Kit de Venta & Distribución Comercial</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Syne',sans-serif]">
              Sistema Listo para Descargar, Instalar y Comercializar
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              GymBro está 100% optimizado como PWA para instalarse en computadoras de recepción (Windows/Mac) y teléfonos de socios y entrenadores (Android/iOS). Configura la marca del gimnasio, haz copias de seguridad o entrega el software a nuevos clientes.
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

            <button
              onClick={handleExportBackup}
              id="btn-commercial-export-backup"
              className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-lime-400" />
              <span>Descargar Base de Datos (.JSON)</span>
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

          {/* Backup, Export and Migration Tools */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Copias de Seguridad & Migración</h3>
                <p className="text-xs text-neutral-400">Descarga o restaura tu información sin depender de la nube</p>
              </div>
            </div>

            {importStatus && (
              <div className="mb-4 p-3.5 rounded-2xl bg-lime-400/10 border border-lime-400/30 text-lime-300 text-xs font-bold">
                {importStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Export */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Exportar Base de Datos</h4>
                  <p className="text-[11px] text-neutral-400 mb-3">
                    Genera un archivo .JSON con todos los socios ({members.length}), pagos y rutinas.
                  </p>
                </div>
                <button
                  onClick={handleExportBackup}
                  id="btn-export-backup-json"
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                >
                  <Download className="w-3.5 h-3.5 text-lime-400" />
                  <span>Descargar Backup</span>
                </button>
              </div>

              {/* Import */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Restaurar Copia</h4>
                  <p className="text-[11px] text-neutral-400 mb-3">
                    Carga un archivo de respaldo previo para migrar a otra computadora o navegador.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    id="btn-import-backup-json"
                    className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Subir Respaldo</span>
                  </button>
                </div>
              </div>

              {/* Reset to Clean */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-400 mb-1">Entregar a Nuevo Cliente</h4>
                  <p className="text-[11px] text-neutral-400 mb-3">
                    Limpia los datos demo para entregar el sistema listo al comprador de la app.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('¿Seguro que deseas inicializar el sistema para un nuevo gimnasio? Se restablecerán los socios de ejemplo.')) {
                      onResetToCleanState();
                    }
                  }}
                  id="btn-reset-clean-gym"
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-red-950/40 text-neutral-300 hover:text-red-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-neutral-700 hover:border-red-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Inicializar Limpio</span>
                </button>
              </div>
            </div>
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

          {/* Commercial Sales Pitch Checklist */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center font-black">
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Argumentario de Venta</h3>
                <p className="text-[11px] text-neutral-400">Puntos clave para vender este software a gimnasios</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Sin comisiones mensuales obligatorias:</strong> El dueño ahorra cientos de dólares al año.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  <strong>100% Instalable y Offline:</strong> Funciona en notebooks de recepción y celulares sin caídas de conexión.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Control de Caja:</strong> Filtra pagos en Efectivo vs. Transferencias al instante.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Rutinas y Fotos de Progreso:</strong> Aumenta la retención de socios hasta un 40%.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Avisos por WhatsApp:</strong> Envío de recordatorios de cobro y mensajes motivacionales en 1 clic.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowInstallModal(true)}
                className="w-full py-2.5 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border border-lime-400/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Ver Guía de Instalación por Dispositivo</span>
              </button>
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
