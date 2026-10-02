import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Check,
  Copy,
  Globe,
  Smartphone,
  Dumbbell,
  ShieldCheck,
  Share2,
  QrCode,
  Download,
  UserPlus,
  Send,
  Trash2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { directCreateUserByOwner } from '../../utils/auth';
import { createWhatsAppLink } from '../../utils/storage';

interface PortalLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigatePortal?: (portal: 'student' | 'trainer' | 'owner') => void;
  onDataReset?: () => void;
  onUserCreated?: () => void;
}

export const PortalLinksModal: React.FC<PortalLinksModalProps> = ({
  isOpen,
  onClose,
  onNavigatePortal,
  onDataReset,
  onUserCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'direct_register' | 'delivery_guide' | 'database'>('qr');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // QR Code data URLs
  const [studentQrUrl, setStudentQrUrl] = useState<string>('');
  const [trainerQrUrl, setTrainerQrUrl] = useState<string>('');
  const [ownerQrUrl, setOwnerQrUrl] = useState<string>('');
  const [selectedQrPortal, setSelectedQrPortal] = useState<'student' | 'trainer' | 'owner'>('student');

  // Direct Create User State
  const [directRole, setDirectRole] = useState<'student' | 'trainer'>('student');
  const [directName, setDirectName] = useState('');
  const [directUsername, setDirectUsername] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const [directPhone, setDirectPhone] = useState('+595 981 ');
  const [directSpecialty, setDirectSpecialty] = useState('Musculación y Fuerza');
  const [directPlanPrice, setDirectPlanPrice] = useState(180000);
  const [directSuccessMsg, setDirectSuccessMsg] = useState<string | null>(null);
  const [directErrorMsg, setDirectErrorMsg] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Database Reset State
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Production Vercel Domain provided by user
  const PROD_VERCEL_DOMAIN = 'https://gymbro-rdma3f0ua-arm3ncdev.vercel.app';
  const currentHost = typeof window !== 'undefined' ? window.location.origin : PROD_VERCEL_DOMAIN;
  const isCurrentlyOnVercel = currentHost.includes('vercel.app');

  const [customDomain, setCustomDomain] = useState<string>(() => {
    return localStorage.getItem('gymbro_custom_domain_override') || '';
  });
  const [domainMode, setDomainMode] = useState<'custom' | 'vercel' | 'origin'>(() => {
    const saved = localStorage.getItem('gymbro_custom_domain_override');
    if (saved) return 'custom';
    // Self-hosted: links must point to this same server so all three portals share one database.
    return isCurrentlyOnVercel ? 'vercel' : 'origin';
  });

  const getCleanDomain = (dom: string) => {
    if (!dom) return '';
    let d = dom.trim();
    if (!d.startsWith('http://') && !d.startsWith('https://')) {
      d = `https://${d}`;
    }
    return d.replace(/\/$/, '');
  };

  const selectedHost =
    domainMode === 'custom' && customDomain.trim()
      ? getCleanDomain(customDomain)
      : domainMode === 'vercel'
      ? PROD_VERCEL_DOMAIN
      : currentHost;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
  const baseUrl = domainMode === 'origin' ? `${selectedHost}${currentPath}` : selectedHost;

  const studentLink = `${baseUrl}/#/alumno`;
  const trainerLink = `${baseUrl}/#/coach`;
  const ownerLink = `${baseUrl}/#/dueno`;

  const handleCustomDomainChange = (val: string) => {
    setCustomDomain(val);
    if (val.trim()) {
      localStorage.setItem('gymbro_custom_domain_override', val.trim());
      setDomainMode('custom');
    } else {
      localStorage.removeItem('gymbro_custom_domain_override');
      setDomainMode(isCurrentlyOnVercel ? 'vercel' : 'origin');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Generate QR codes using qrcode library
    QRCode.toDataURL(studentLink, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then((url) => setStudentQrUrl(url))
      .catch((err) => console.error('QR student error:', err));

    QRCode.toDataURL(trainerLink, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then((url) => setTrainerQrUrl(url))
      .catch((err) => console.error('QR trainer error:', err));

    QRCode.toDataURL(ownerLink, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then((url) => setOwnerQrUrl(url))
      .catch((err) => console.error('QR owner error:', err));
  }, [isOpen, studentLink, trainerLink, ownerLink]);

  if (!isOpen) return null;

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadQr = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDirectCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectSuccessMsg(null);
    setDirectErrorMsg(null);
    setIsCreatingUser(true);

    try {
      const res = await directCreateUserByOwner({
        name: directName,
        username: directUsername,
        password: directPassword,
        role: directRole,
        phone: directPhone,
        specialty: directRole === 'trainer' ? directSpecialty : undefined,
        planPrice: directRole === 'student' ? Number(directPlanPrice) : undefined,
      });

      if (res.success) {
        setDirectSuccessMsg(
          `¡Usuario ${directRole === 'student' ? 'de Alumno' : 'de Entrenador'} creado con éxito! Ya puede ingresar desde su dispositivo.`
        );
        setDirectName('');
        setDirectUsername('');
        setDirectPassword('');
        if (onUserCreated) onUserCreated();
      } else {
        setDirectErrorMsg(res.error || 'Error al crear usuario.');
      }
    } catch (err: any) {
      setDirectErrorMsg(err.message || 'Error inesperado.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('¿Seguro que deseas reiniciar el sistema a 0 miembros y 0 usuarios de prueba? Esta acción es irreversible.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/gym-data/clear-all', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('gymbro_app_data_v1');
        localStorage.removeItem('gymbro_registered_users_v2');
        setResetSuccess(true);
        if (onDataReset) onDataReset();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      console.error('Error clearing data:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const qrPortals = [
    {
      key: 'student',
      title: 'Portal de Alumnos',
      role: 'Alumno',
      url: studentLink,
      qrUrl: studentQrUrl,
      icon: Smartphone,
      color: 'lime',
      badge: 'Escaneo con cámara de celular',
      desc: 'Coloca este QR en el mostrador o recepción del gimnasio. Los alumnos lo escanean para registrarse o ingresar a su rutina.',
      waMessage: `¡Hola! Podés ingresar a tu portal de alumno de GymBro para ver tu rutina diaria y cuota escaneando o tocando este enlace: ${studentLink}`,
    },
    {
      key: 'trainer',
      title: 'Portal de Profesores',
      role: 'Entrenador',
      url: trainerLink,
      qrUrl: trainerQrUrl,
      icon: Dumbbell,
      color: 'cyan',
      badge: 'Equipo Técnico',
      desc: 'Comparte este link a tus profesores para que puedan armar rutinas, seguir el progreso de los atletas y aprobar cobros.',
      waMessage: `¡Hola profe! Aquí tenés tu enlace de acceso al portal de entrenadores de GymBro: ${trainerLink}`,
    },
    {
      key: 'owner',
      title: 'Portal de Dueño & Administración',
      role: 'Administrador',
      url: ownerLink,
      qrUrl: ownerQrUrl,
      icon: ShieldCheck,
      color: 'amber',
      badge: 'Privado',
      desc: 'Enlace exclusivo para la administración del gimnasio, control de caja, cobros y estadísticas globales.',
      waMessage: `Acceso privado para administración de GymBro: ${ownerLink}`,
    },
  ];

  const currentQrConfig = qrPortals.find((p) => p.key === selectedQrPortal) || qrPortals[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-['Syne',sans-serif]">
                Accesos, Enlaces y Código QR
              </h3>
              <p className="text-xs text-neutral-400">
                Comparte o registra profesores y alumnos con sincronización multi-dispositivo en tiempo real.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-lime-400 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Códigos QR y Enlaces
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery_guide')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'delivery_guide'
                ? 'bg-lime-400 text-neutral-950 shadow-md'
                : 'text-lime-400 hover:text-white bg-lime-400/10 border border-lime-400/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Entrega al Cliente (Sin Google)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('direct_register')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'direct_register'
                ? 'bg-lime-400 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Crear Usuario
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-red-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Base de Datos
          </button>
        </div>

        {/* TAB 1: QR & LINKS */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            {/* Domain Switcher & Custom Domain Input */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-lime-400 shrink-0" />
                  <div>
                    <span className="text-white font-bold block">Dominio Activo para Enlaces y QR:</span>
                    <span className="text-lime-400 font-mono text-[11px] truncate block">
                      {baseUrl}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDomainMode('vercel')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      domainMode === 'vercel'
                        ? 'bg-lime-400 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Vercel Oficial
                  </button>

                  <button
                    type="button"
                    onClick={() => setDomainMode('custom')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      domainMode === 'custom'
                        ? 'bg-cyan-400 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Dominio Propio (.net.py)
                  </button>

                  {!isCurrentlyOnVercel && (
                    <button
                      type="button"
                      onClick={() => setDomainMode('origin')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        domainMode === 'origin'
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      Host Actual
                    </button>
                  )}
                </div>
              </div>

              {domainMode === 'custom' && (
                <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                    Ingresa tu dominio propio:
                  </span>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => handleCustomDomainChange(e.target.value)}
                    placeholder="ej: local.net.py o gymbro.com.py"
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 font-mono outline-none focus:border-cyan-400"
                  />
                  {customDomain && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 self-center">
                      <Check className="w-3 h-3" /> Configurado
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick 3-Portal Access Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Dueño
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-mono">/dueno</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Caja, socios, profesores y cobros
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('owner_quick', ownerLink)}
                  className="w-full py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                >
                  {copiedKey === 'owner_quick' ? <Check className="w-3 h-3 text-lime-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'owner_quick' ? '¡Copiado!' : 'Copiar Link Dueño'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" />
                    Entrenadores
                  </span>
                  <span className="text-[10px] text-cyan-400/80 font-mono">/coach</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Para tu equipo de profesores y rutinas
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('trainer_quick', trainerLink)}
                  className="w-full py-1 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                >
                  {copiedKey === 'trainer_quick' ? <Check className="w-3 h-3 text-lime-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'trainer_quick' ? '¡Copiado!' : 'Copiar Link Profe'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-lime-500/10 border border-lime-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-lime-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Alumnos
                  </span>
                  <span className="text-[10px] text-lime-400/80 font-mono">/alumno</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Registro y portal de socios del gym
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('student_quick', studentLink)}
                  className="w-full py-1 px-2 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 text-lime-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                >
                  {copiedKey === 'student_quick' ? <Check className="w-3 h-3 text-lime-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'student_quick' ? '¡Copiado!' : 'Copiar Link Alumno'}</span>
                </button>
              </div>
            </div>

            {/* Sub-selector of portal */}
            <div className="grid grid-cols-3 gap-2">
              {qrPortals.map((portal) => {
                const Icon = portal.icon;
                const isSelected = selectedQrPortal === portal.key;
                return (
                  <button
                    key={portal.key}
                    type="button"
                    onClick={() => setSelectedQrPortal(portal.key as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-lime-400 bg-lime-400/10 text-white font-bold'
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-lime-400' : 'text-neutral-500'}`} />
                    <div className="truncate">
                      <p className="text-xs truncate">{portal.title}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{portal.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Featured QR Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
              {/* QR Image Box */}
              <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0 flex flex-col items-center">
                {currentQrConfig.qrUrl ? (
                  <img
                    src={currentQrConfig.qrUrl}
                    alt={`QR Code ${currentQrConfig.title}`}
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-neutral-500 font-mono">
                    Generando QR...
                  </div>
                )}
                <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider mt-1.5 font-mono">
                  GymBro • {currentQrConfig.role}
                </span>
              </div>

              {/* QR Details & Actions */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    {currentQrConfig.badge}
                  </div>
                  <h4 className="text-base font-extrabold text-white">{currentQrConfig.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {currentQrConfig.desc}
                  </p>
                </div>

                {/* Direct Link Box */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentQrConfig.url}
                    className="bg-transparent text-xs text-neutral-300 font-mono flex-1 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(currentQrConfig.key, currentQrConfig.url)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors shrink-0 flex items-center gap-1"
                  >
                    {copiedKey === currentQrConfig.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-lime-400" />
                        <span className="text-lime-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {currentQrConfig.qrUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(currentQrConfig.qrUrl, `gymbro_qr_${currentQrConfig.key}.png`)}
                      className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar QR
                    </button>
                  )}
                  <a
                    href={currentQrConfig.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors border border-neutral-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    Abrir Link
                  </a>
                  <a
                    href={createWhatsAppLink('', currentQrConfig.waMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/30 text-xs font-bold transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Quick summary cards of all 3 portals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              {qrPortals.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.key} className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs font-bold text-white">{p.role}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir en nueva pestaña"
                          className="text-neutral-400 hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(p.key, p.url)}
                          className="text-[11px] text-lime-400 hover:underline flex items-center gap-0.5 font-semibold"
                        >
                          {copiedKey === p.key ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-mono truncate">{p.url}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT REGISTER BY OWNER */}
        {activeTab === 'direct_register' && (
          <form onSubmit={handleDirectCreateSubmit} className="space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Alta Directa de Usuario</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    El gimnasio asigna directamente el usuario y contraseña para que el entrenador o alumno ingrese al instante.
                  </p>
                </div>
                {/* Role Switch */}
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDirectRole('student')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      directRole === 'student' ? 'bg-lime-400 text-neutral-950' : 'text-neutral-400'
                    }`}
                  >
                    Alumno
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectRole('trainer')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      directRole === 'trainer' ? 'bg-cyan-400 text-neutral-950' : 'text-neutral-400'
                    }`}
                  >
                    Profesor
                  </button>
                </div>
              </div>

              {directSuccessMsg && (
                <div className="p-3 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{directSuccessMsg}</span>
                </div>
              )}

              {directErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{directErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Ej: Sofía Gómez"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-lime-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Nombre de Usuario (Login)</label>
                  <input
                    type="text"
                    required
                    value={directUsername}
                    onChange={(e) => setDirectUsername(e.target.value)}
                    placeholder="Ej: sofia"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-lime-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Contraseña de Acceso</label>
                  <input
                    type="text"
                    required
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    placeholder="Ej: gym123"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-lime-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-lime-400 outline-none"
                  />
                </div>

                {directRole === 'student' ? (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-neutral-300 block mb-1">Precio de Cuota Mensual (₲)</label>
                    <input
                      type="number"
                      value={directPlanPrice}
                      onChange={(e) => setDirectPlanPrice(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-lime-400 outline-none"
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-neutral-300 block mb-1">Especialidad del Entrenador</label>
                    <input
                      type="text"
                      value={directSpecialty}
                      onChange={(e) => setDirectSpecialty(e.target.value)}
                      placeholder="Ej: Hipertrofia, Fuerza y Preparación Física"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-lime-400 outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isCreatingUser ? 'Creando en el servidor...' : `Crear ${directRole === 'student' ? 'Alumno' : 'Profesor'} Oficial`}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DELIVERY GUIDE (SIN GOOGLE) */}
        {activeTab === 'delivery_guide' && (
          <div className="space-y-4">
            {/* Why Google asks for email banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>¿Por qué tu cliente ve la pantalla de Google y carga de AI Studio?</span>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                El enlace que termina en <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">ais-pre-*.run.app</code> es un entorno de desarrollo dentro de Google Cloud. Por seguridad de Google, si una persona que no es colaboradora del proyecto abre ese enlace en su navegador, Google Cloud le pide que ingrese su correo de Google y luego muestra la pantalla de carga de AI Studio.
              </p>
            </div>

            {/* How to deliver without Google screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option A: PWA install */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-lime-400 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>Método 1: Instalación como App PWA</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Para que tu cliente o sus profesores lo usen sin molestias, indícales que toquen en su navegador:
                </p>
                <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                  <p><strong>En Android (Chrome):</strong> Menú (⋮) → <span className="text-lime-400 font-bold">"Instalar aplicación"</span> o <span className="text-lime-400 font-bold">"Agregar a la pantalla principal"</span>.</p>
                  <p><strong>En iPhone (Safari):</strong> Botón Compartir (⬆) → <span className="text-lime-400 font-bold">"Agregar a inicio"</span>.</p>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Una vez agregada, la app abre en pantalla completa con su ícono GymBro en el teléfono y no vuelve a pedir cuenta de Google.
                </p>
              </div>

              {/* Option B: Public deployment */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Globe className="w-4 h-4" />
                  <span>Método 2: Despliegue Público (1 Clic)</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Para entregarle el sistema terminado a tu cliente con su propio enlace web público (ej. <code className="text-cyan-300">gimnasio.com</code> o <code className="text-cyan-300">gymbro.vercel.app</code>):
                </p>
                <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 space-y-1">
                  <p className="text-neutral-400">// Compilar la app para producción:</p>
                  <p className="text-lime-400">npm run build</p>
                  <p className="text-neutral-400">// Subir a Vercel, Netlify o Render (100% gratis)</p>
                </div>
                <p className="text-[11px] text-neutral-400">
                  En un hosting público, cualquier alumno o profesor abre la página al instante sin pedir cuenta de Google jamás.
                </p>
              </div>
            </div>

            {/* Portal links ready for WhatsApp (no passwords: each person uses their own account) */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-lime-400" />
                  <span>Enlaces Listos para Enviar por WhatsApp:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const msg = `🏋️‍♂️ *GymBro - Enlaces de Acceso*\n\n` +
                      `💪 *Profesores:* ${trainerLink}\n` +
                      `📲 *Alumnos:* ${studentLink}\n\n` +
                      `Cada uno ingresa con su propio usuario y contraseña, o crea su cuenta desde el enlace.`;
                    handleCopy('all_creds_wa', msg);
                  }}
                  id="btn-copy-all-creds"
                  className="py-1 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'all_creds_wa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'all_creds_wa' ? '¡Copiado para WhatsApp!' : 'Copiar todo para WhatsApp'}</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                Las contraseñas nunca se comparten por este medio: cada profesor y alumno usa su propia cuenta.
              </p>
            </div>
          </div>
        )}
        {activeTab === 'database' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">Gimnasio en Producción: Cero Usuarios de Prueba</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Para cuando le vendas la aplicación al dueño de un gimnasio, el sistema debe iniciar 100% limpio. Al presionar este botón, se borran todos los usuarios de demostración y se deja la base de datos lista para registrar a sus alumnos y profesores reales.
                </p>
              </div>
            </div>

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>¡Base de datos limpiada con éxito! Reiniciando sistema...</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-3">
              <p className="text-xs text-red-300">
                <strong>Atención:</strong> Esta acción vacía la lista de socios y usuarios de prueba tanto en el servidor central como en este navegador.
              </p>
              <button
                type="button"
                onClick={handleClearDatabase}
                disabled={isResetting}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isResetting ? 'Vaciando base de datos...' : 'Eliminar Todos los Usuarios de Prueba y Comenzar Limpio'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
