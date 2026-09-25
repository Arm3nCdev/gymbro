import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Upload,
  Sparkles,
  Check,
  ShieldCheck,
  Dumbbell,
  Smartphone,
  Phone,
  Mail,
  FileText,
  Target,
  Award,
} from 'lucide-react';
import { AuthUser, GymMember, UserRole } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  currentMember?: GymMember;
  onUpdateProfile: (updatedData: {
    userId: string;
    name: string;
    avatar: string;
    bio: string;
    phone?: string;
    email?: string;
    specialty?: string;
    goal?: string;
  }) => Promise<void>;
}

const PRESET_AVATARS = [
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', label: 'Atleta 1' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', label: 'Coach 1' },
  { url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=300&q=80', label: 'Gym Pro' },
  { url: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=300&q=80', label: 'Fuerza' },
  { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=300&q=80', label: 'Fitness' },
  { url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=300&q=80', label: 'Cross' },
  { url: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=300&q=80', label: 'Power' },
  { url: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=300&q=80', label: 'Trainer' },
];

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
  const [bio, setBio] = useState(currentUser.bio || currentUser.description || currentMember?.bio || currentMember?.description || '');
  const [phone, setPhone] = useState(currentUser.phone || currentMember?.phone || '');
  const [email, setEmail] = useState(currentUser.email || currentMember?.email || '');
  const [specialty, setSpecialty] = useState(currentUser.specialty || 'Musculación, Hipertrofia y Rendimiento');
  const [goal, setGoal] = useState(currentMember?.goal || 'Aumento de masa muscular y fuerza');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

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
      bioPlaceholder: 'Ej: Especialista en hipertrofia y fuerza. Más de 6 años preparando atletas.',
    },
    student: {
      label: 'Alumno del Gimnasio',
      badgeColor: 'text-lime-400 bg-lime-400/10 border-lime-400/30',
      icon: Smartphone,
      bioPlaceholder: 'Ej: Entrenando con constancia enfocado en recomposición corporal y salud.',
    },
  }[role];

  const RoleIcon = roleInfo.icon;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Por favor selecciona una imagen de menos de 3 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setAvatar(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
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
        bio: bio.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        specialty: role === 'trainer' ? specialty.trim() : undefined,
        goal: role === 'student' ? goal.trim() : undefined,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lime-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base font-['Syne',sans-serif]">
                Perfil de Usuario
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${roleInfo.badgeColor}`}>
                <RoleIcon className="w-3 h-3" />
                {roleInfo.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Avatar Section */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={avatar}
                alt={name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-lime-400 shadow-md bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Subir foto desde tu dispositivo"
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-lime-400 hover:bg-lime-300 text-neutral-950 shadow-lg active:scale-95 transition-all"
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

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1">
                  <span>Foto de Perfil</span>
                  <Sparkles className="w-3 h-3 text-lime-400" />
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Sube tu propia foto o selecciona uno de los avatares predeterminados.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3 h-3 text-lime-400" />
                  <span>Subir Imagen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="py-1 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <span>{showPresets ? 'Ocultar Opciones' : 'Ver Avatares'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preset Avatars Grid */}
          {showPresets && (
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3 animate-in fade-in duration-150">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                Elige un avatar deportivo:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(av.url);
                      setShowPresets(false);
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 aspect-square ${
                      avatar === av.url ? 'border-lime-400 scale-95 ring-2 ring-lime-400/40' : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <img src={av.url} alt={av.label} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3.5">
            {/* Name */}
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

            {/* Optional Bio / Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-lime-400" />
                  <span>Descripción / Biografía</span>
                </label>
                <span className="text-[10px] text-neutral-500 uppercase font-mono">Opcional</span>
              </div>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={roleInfo.bioPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-lime-400 leading-relaxed"
              />
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

            {/* Role Specific Field */}
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
                  placeholder="Ej: Musculación, Hipertrofia y Fuerza"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {role === 'student' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-lime-400" />
                  <span>Objetivo de Entrenamiento</span>
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
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-bold transition-colors"
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
                  <span>¡Guardado!</span>
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
