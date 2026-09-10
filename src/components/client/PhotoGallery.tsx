import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Plus, Upload, Columns, Sparkles, X, Trash2, Calendar, Scale } from 'lucide-react';
import { ProgressPhoto } from '../../types';
import { formatDate } from '../../utils/storage';

interface PhotoGalleryProps {
  photos: ProgressPhoto[];
  currentWeight?: number;
  onAddPhoto: (photo: ProgressPhoto) => void;
  onDeletePhoto?: (photoId: string) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos = [],
  currentWeight = 78,
  onAddPhoto,
  onDeletePhoto,
}) => {
  const safePhotos = Array.isArray(photos) ? photos : [];
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareA, setCompareA] = useState<string>(safePhotos[0]?.id || '');
  const [compareB, setCompareB] = useState<string>(safePhotos[safePhotos.length - 1]?.id || '');

  // Form states
  const [imagePreview, setImagePreview] = useState<string>('');
  const [tag, setTag] = useState<'Frente' | 'Perfil' | 'Espalda' | 'General'>('Frente');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState<number>(currentWeight);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setImagePreview(sampleUrl);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) return;

    onAddPhoto({
      id: `p_${Date.now()}`,
      date,
      imageUrl: imagePreview,
      tag,
      weightKg: Number(weightKg) || undefined,
      note: note.trim() || undefined,
    });

    setShowUploadModal(false);
    setImagePreview('');
    setNote('');
  };

  const photoA = safePhotos.find((p) => p.id === compareA) || safePhotos[0] || null;
  const photoB = safePhotos.find((p) => p.id === compareB) || safePhotos[safePhotos.length - 1] || null;

  return (
    <div id="client-photo-gallery" className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-lime-400" />
            Fotos de Progreso y Transformación
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Registrá tus cambios visuales para comparar tu evolución a lo largo del tiempo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {safePhotos.length >= 2 && (
            <button
              onClick={() => setShowCompareModal(true)}
              id="btn-open-compare"
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
              <span>Comparar Antes / Después</span>
            </button>
          )}

          <button
            onClick={() => setShowUploadModal(true)}
            id="btn-open-upload-photo"
            className="py-2 px-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Subir Foto</span>
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      {safePhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {safePhotos.map((photo) => (
            <div
              key={photo.id}
              id={`photo-card-${photo.id}`}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden group hover:border-neutral-700 transition-all shadow-sm"
            >
              <div className="relative h-64 bg-neutral-950 overflow-hidden">
                <img
                  src={photo.imageUrl}
                  alt={`Progreso ${photo.tag}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white font-bold text-[11px] border border-white/10">
                    {photo.tag}
                  </span>
                  {photo.weightKg && (
                    <span className="px-2 py-1 rounded-lg bg-lime-400/90 text-neutral-950 font-black text-[11px]">
                      {photo.weightKg} kg
                    </span>
                  )}
                </div>

                {onDeletePhoto && (
                  <button
                    onClick={() => onDeletePhoto(photo.id)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-neutral-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1 font-mono text-neutral-300">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    {formatDate(photo.date)}
                  </span>
                </div>
                {photo.note && (
                  <p className="text-neutral-300 text-xs italic line-clamp-2 pt-0.5">
                    "{photo.note}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 space-y-3">
          <ImageIcon className="w-12 h-12 text-neutral-600 mx-auto" />
          <div>
            <h4 className="font-bold text-white text-base">Aún no registraste fotos de progreso</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Subí una foto cada 15 o 30 días con la misma luz para ver tu transformación real de masa y definición.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-lime-400/20"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Mi Primera Foto</span>
          </button>
        </div>
      )}

      {/* Before & After Comparison Modal */}
      {showCompareModal && photoA && photoB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Columns className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-white text-base">Comparador Antes vs Después</h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selectors for comparison photos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Foto Inicial (Antes)
                </label>
                <select
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  {safePhotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tag} - {formatDate(p.date)} {p.weightKg ? `(${p.weightKg} kg)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Foto Actual (Después)
                </label>
                <select
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  {safePhotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tag} - {formatDate(p.date)} {p.weightKg ? `(${p.weightKg} kg)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-Side View */}
            {photoA && photoB ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden relative">
                  <img
                    src={photoA.imageUrl}
                    alt="Antes"
                    referrerPolicy="no-referrer"
                    className="w-full h-72 object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-white font-bold text-xs border border-white/10">
                    ANTES • {formatDate(photoA.date)}
                  </div>
                  {photoA.weightKg && (
                    <div className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-white">
                      {photoA.weightKg} kg
                    </div>
                  )}
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden relative">
                  <img
                    src={photoB.imageUrl}
                    alt="Después"
                    referrerPolicy="no-referrer"
                    className="w-full h-72 object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-lime-400 text-neutral-950 px-3 py-1 rounded-lg font-black text-xs shadow-md">
                    DESPUÉS • {formatDate(photoB.date)}
                  </div>
                  {photoB.weightKg && (
                    <div className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-lime-400">
                      {photoB.weightKg} kg
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">Se necesitan al menos 2 fotos para comparar.</p>
            )}

            <div className="text-center pt-2">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-6 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold"
              >
                Cerrar Comparador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-lime-400" />
                Subir Foto de Progreso
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              {/* File upload or sample selector */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-photo"
                />

                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview('')}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-neutral-700 hover:border-lime-400 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/60 transition-colors p-4 text-center"
                  >
                    <Upload className="w-8 h-8 text-neutral-400 mb-1" />
                    <span className="text-xs font-bold text-white">
                      Hacé clic para seleccionar una foto
                    </span>
                    <span className="text-[11px] text-neutral-500 mt-0.5">
                      JPG, PNG o WebP desde tu celular o PC
                    </span>
                  </div>
                )}

                {/* Sample quick picks */}
                {!imagePreview && (
                  <div className="mt-2.5">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500 block mb-1">
                      O elegí una foto de muestra para probar:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectSample('https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80')}
                        className="text-[11px] px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        Muestra 1 (Frente)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSample('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80')}
                        className="text-[11px] px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        Muestra 2 (Perfil)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSample('https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80')}
                        className="text-[11px] px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        Muestra 3 (Progreso)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Angle Tag & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Ángulo / Pose
                  </label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                  >
                    <option value="Frente">Frente</option>
                    <option value="Perfil">Perfil</option>
                    <option value="Espalda">Espalda</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {/* Weight at photo time */}
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Peso registrado ese día (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  placeholder="Ej: 78.5"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Nota / Sensación (opcional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: 8 semanas de entrenamiento estricto..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!imagePreview}
                  id="btn-submit-photo"
                  className="flex-1 py-2.5 rounded-xl bg-lime-400 disabled:opacity-50 text-neutral-950 font-bold text-xs hover:bg-lime-300 shadow-md shadow-lime-400/20"
                >
                  Guardar Foto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
