import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Upload,
  Link as LinkIcon,
  Cake,
  FileText,
  Phone,
  Mail,
  Target,
  Award,
  Check,
  ShieldCheck,
  Dumbbell,
  Smartphone,
  Trash2,
  Palette,
  Image as ImageIcon,
} from 'lucide-react';
import { AuthUser, GymMember } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  currentMember?: GymMember;
  onUpdateProfile: (updatedData: {
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
  }) => Promise<void>;
}

// Real fitness photos for sample selection (NOT AI generated)
const REAL_SAMPLE_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', label: 'Atleta Fitness' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', label: 'Coach Pro' },
  { url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=300&q=80', label: 'Gimnasio' },
  { url: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=300&q=80', label: 'Entrenador' },
  { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=300&q=80', label: 'Atleta Mujer' },
  { url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=300&q=80', label: 'CrossFit' },
  { url: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=300&q=80', label: 'Powerlifting' },
  { url: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=300&q=80', label: 'Fuerza' },
];

// Helper to generate initials SVG avatar with custom background color
const generateInitialsAvatar = (name: string, bgColor: string, textColor = '#ffffff') => {
  const parts = name.trim().split(' ').filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.slice(0, 2) || 'GB').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <rect width="160" height="160" rx="36" fill="${bgColor}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="64" fill="${textColor}" letter-spacing="1">
      ${initials}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentMember,
  onUpdateProfile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialAvatar =
    currentUser.avatar ||
    currentMember?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  const [avatar, setAvatar] = useState(initialAvatar);
  const [name, setName] = useState(currentUser.name || currentMember?.name || '');
  const [birthDate, setBirthDate] = useState(currentUser.birthDate || currentMember?.birthDate || '');
  const [bio, setBio] = useState(currentUser.bio || currentUser.description || currentMember?.bio || currentMember?.description || '');
  const [phone, setPhone] = useState(currentUser.phone || currentMember?.phone || '');
  const [email, setEmail] = useState(currentUser.email || currentMember?.email || '');
  const [specialty, setSpecialty] = useState(currentUser.specialty || 'Musculación, Hipertrofia y Rendimiento');
  const [goal, setGoal] = useState(currentMember?.goal || 'Aumento de masa muscular y fuerza');
  
  // Custom URL input
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  
  // Real sample selector
  const [showSamplePhotos, setShowSamplePhotos] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const role = currentUser.role;

  const roleInfo = {
    owner: {
      label: 'Dueño / Administración',
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
      icon: ShieldCheck,
      bioPlaceholder: 'Ej: Dueño y Administrador general del gimnasio.',
    },
    trainer: {
      label: 'Coach / Entrenador',
      badgeColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
      icon: Dumbbell,
      bioPlaceholder: 'Ej: Especialista en hipertrofia y fuerza. Más de 6 años preparando atletas. Enfocado en técnica impecable y progresión constante.',
    },
    student: {
      label: 'Alumno del Gimnasio',
      badgeColor: 'text-lime-400 bg-lime-400/10 border-lime-400/30',
      icon: Smartphone,
      bioPlaceholder: 'Ej: Entreno de lunes a viernes, enfocado en recomposición corporal y mejorar marcas en sentadilla y banco. ¡Modo bestia!',
    },
  }[role];

  const RoleIcon = roleInfo.icon;

  // Calculate age and birthday status
  const calculateBirthdayDetails = (dateStr: string) => {
    if (!dateStr) return null;
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const birth = new Date(year, month, day);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    const isTodayBirthday = today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth();
    const formatted = birth.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

    return { age: Math.max(0, age), isTodayBirthday, formatted };
  };

  const birthdayDetails = calculateBirthdayDetails(birthDate);

  // File upload from device (camera or gallery)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('Por favor selecciona una foto de menos de 4 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setAvatar(uploadEvent.target.result as string);
          setPhotoFeedback('¡Foto cargada desde tu dispositivo!');
          setTimeout(() => setPhotoFeedback(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Set avatar from custom link
  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    setAvatar(customUrl.trim());
    setIsUrlInputOpen(false);
    setPhotoFeedback('¡Enlace de foto aplicado!');
    setTimeout(() => setPhotoFeedback(null), 3000);
  };

  // Monogram generation
  const handleGenerateMonogram = (colorHex: string) => {
    const monogram = generateInitialsAvatar(name || 'Gym Bro', colorHex);
    setAvatar(monogram);
    setPhotoFeedback('¡Avatar de iniciales personalizado generado!');
    setTimeout(() => setPhotoFeedback(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await onUpdateProfile({
        userId: currentUser.id,
        name: name.trim(),
        avatar: avatar.trim(),
        birthDate: birthDate.trim() || undefined,
        bio: bio.trim(),
        description: bio.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        specialty: role === 'trainer' ? specialty.trim() : undefined,
        goal: role === 'student' ? goal.trim() : undefined,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lime-400 shadow-sm">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base font-['Syne',sans-serif]">
                Modificar Mi Perfil
              </h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${roleInfo.badgeColor}`}>
                <RoleIcon className="w-3 h-3" />
                {roleInfo.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Custom Avatar Section (Non-AI, 100% personalized) */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-lime-400" />
                <span>Foto de Perfil Personalizada</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">100% Personalizable</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={avatar}
                  alt={name || 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-lime-400 shadow-md bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Subir foto desde tu dispositivo o cámara"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 shadow-md active:scale-95 transition-all"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Elige tu propia foto real desde tu dispositivo o cámara, ingresa un enlace o personaliza tus iniciales.
                </p>

                {photoFeedback && (
                  <div className="text-[11px] text-lime-400 bg-lime-400/10 border border-lime-400/30 px-2.5 py-1 rounded-lg font-medium inline-block">
                    {photoFeedback}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  {/* Upload file button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-lime-400" />
                    <span>Subir Foto</span>
                  </button>

                  {/* URL button */}
                  <button
                    type="button"
                    onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                    className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pegar Enlace</span>
                  </button>

                  {/* Samples button */}
                  <button
                    type="button"
                    onClick={() => setShowSamplePhotos(!showSamplePhotos)}
                    className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{showSamplePhotos ? 'Ocultar Muestras' : 'Fotos Reales'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom URL Input popdown */}
            {isUrlInputOpen && (
              <div className="pt-2 border-t border-neutral-800/80 space-y-2 animate-in fade-in duration-150">
                <span className="text-[11px] font-semibold text-neutral-300 block">
                  Pega la dirección de tu foto (URL de internet):
                </span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/mi-foto.jpg"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="py-1.5 px-3 rounded-xl bg-cyan-400 text-neutral-950 font-bold text-xs hover:bg-cyan-300 transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Monogram Colors Generator */}
            <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Palette className="w-3 h-3 text-lime-400" />
                <span>O crea tu avatar con tus iniciales:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { color: '#84cc16', label: 'Lima' },
                  { color: '#06b6d4', label: 'Cyan' },
                  { color: '#f59e0b', label: 'Ámbar' },
                  { color: '#f43f5e', label: 'Rosa' },
                  { color: '#8b5cf6', label: 'Violeta' },
                  { color: '#171717', label: 'Negro' },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    title={`Avatar con iniciales en color ${item.label}`}
                    onClick={() => handleGenerateMonogram(item.color)}
                    style={{ backgroundColor: item.color }}
                    className="w-5 h-5 rounded-full border border-neutral-700 hover:scale-125 transition-transform"
                  />
                ))}
              </div>
            </div>

            {/* Real sample athlete photos */}
            {showSamplePhotos && (
              <div className="pt-3 border-t border-neutral-800 space-y-2 animate-in fade-in duration-150">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Fotos reales deportivas (sin IA):
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {REAL_SAMPLE_PHOTOS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatar(item.url);
                        setShowSamplePhotos(false);
                        setPhotoFeedback(`Foto "${item.label}" seleccionada.`);
                        setTimeout(() => setPhotoFeedback(null), 3000);
                      }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 aspect-square group ${
                        avatar === item.url ? 'border-lime-400 scale-95 ring-2 ring-lime-400/40' : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <img src={item.url} alt={item.label} className="w-full h-full object-cover rounded-lg group-hover:opacity-90" />
                      <span className="absolute bottom-1 inset-x-1 text-[9px] font-bold text-center bg-black/75 rounded text-white py-0.5 truncate px-1">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-lime-400" />
                <span>Nombre Completo *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre y apellido"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400"
              />
            </div>

            {/* Birthday / Cumpleaños (Requested by user) */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fecha de Cumpleaños / Nacimiento</span>
                </label>
                {birthdayDetails && (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    {birthdayDetails.age} años
                  </span>
                )}
              </div>

              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 [color-scheme:dark]"
              />

              {birthdayDetails ? (
                <div className="text-[11px] text-neutral-300 flex items-center gap-2 pt-0.5">
                  {birthdayDetails.isTodayBirthday ? (
                    <span className="text-amber-300 font-extrabold flex items-center gap-1 animate-pulse">
                      🎂 ¡Hoy es tu cumpleaños! ¡Muchas felicidades máquina! 🎉
                    </span>
                  ) : (
                    <span>
                      Tu cumpleaños se celebra el <strong className="text-white">{birthdayDetails.formatted}</strong> ({birthdayDetails.age} años).
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500">
                  Ingresa tu fecha de nacimiento para recibir saludos de cumpleaños y seguimiento personalizado de edad en tus entrenamientos.
                </p>
              )}
            </div>

            {/* Bio / Description (Requested by user) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-lime-400" />
                  <span>Descripción Personal / Sobre Mí</span>
                </label>
                <span className="text-[10px] text-neutral-500 uppercase font-mono">Personalizable</span>
              </div>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={roleInfo.bioPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 leading-relaxed"
              />
              <p className="text-[10px] text-neutral-500">
                Puedes escribir tus metas, motivación personal, filosofía o cualquier detalle que desees mostrar en tu perfil.
              </p>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-lime-400" />
                  <span>Teléfono / WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+595 981 123456"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-lime-400" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@gymbro.app"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* Role Specific Field: Specialty (Trainer) or Goal (Student) */}
            {role === 'trainer' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Especialidad del Entrenador</span>
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Musculación, Hipertrofia y Rendimiento"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {role === 'student' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-lime-400" />
                  <span>Objetivo Principal de Entrenamiento</span>
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ej: Aumento de masa muscular y fuerza"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className={`py-2.5 px-5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                savedSuccess
                  ? 'bg-emerald-400 text-neutral-950 shadow-emerald-400/20'
                  : 'bg-lime-400 hover:bg-lime-300 text-neutral-950 shadow-lime-400/20'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Perfil Actualizado!</span>
                </>
              ) : isSaving ? (
                <span>Guardando...</span>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
