import React from 'react';
import { Dumbbell } from 'lucide-react';

// The gym's logo (Identidad del Gimnasio) or, when it has none, the GymBro dumbbell.
export const GymLogo: React.FC<{ logoUrl?: string; name?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  logoUrl,
  name,
  size = 'md',
}) => {
  const box = size === 'sm' ? 'w-9 h-9 rounded-xl' : size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl';
  const icon = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ? `Logo de ${name}` : 'Logo del gimnasio'}
        className={`${box} object-contain bg-white p-0.5 shadow-lg shrink-0`}
      />
    );
  }
  return (
    <div className={`${box} bg-lime-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-lime-400/20 font-black shrink-0`}>
      <Dumbbell className={`${icon} stroke-[2.5]`} />
    </div>
  );
};

// Turns an uploaded image into a small data URL (max 256 px, PNG to keep transparency, or
// JPEG when the PNG would be heavy) so the logo travels with the gym's settings.
export function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) {
      reject(new Error('Elegí una imagen PNG, JPG, WEBP o SVG.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width || max, img.height || max));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((img.width || max) * scale));
        canvas.height = Math.max(1, Math.round((img.height || max) * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Tu navegador no pudo procesar la imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let url = canvas.toDataURL('image/png');
        if (url.length > 200_000) url = canvas.toDataURL('image/jpeg', 0.85);
        resolve(url);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
