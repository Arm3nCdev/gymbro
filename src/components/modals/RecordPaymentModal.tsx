import React, { useState } from 'react';
import { X, CheckCircle2, Banknote, Smartphone, Share2, Copy, Check } from 'lucide-react';
import { GymMember, PaymentMethod, PaymentRecord } from '../../types';
import { formatCurrency, createWhatsAppLink } from '../../utils/storage';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GymMember[];
  selectedMemberId?: string;
  onSavePayment: (memberId: string, payment: PaymentRecord) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  onSavePayment,
}) => {
  const safeMembers = Array.isArray(members) ? members : [];
  const [memberId, setMemberId] = useState(selectedMemberId || (safeMembers[0]?.id || ''));
  const currentMember = safeMembers.find((m) => m.id === memberId) || safeMembers[0] || null;

  const [method, setMethod] = useState<PaymentMethod>(currentMember?.paymentMethod || 'transferencia');
  const [amount, setAmount] = useState<number>(currentMember?.planPrice || 180000);
  const [period, setPeriod] = useState<string>('Septiembre 2026');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptNote, setReceiptNote] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState<PaymentRecord | null>(null);

  if (!isOpen) return null;

  const handleMemberChange = (id: string) => {
    setMemberId(id);
    const m = members.find((x) => x.id === id);
    if (m) {
      setMethod(m.paymentMethod);
      setAmount(m.planPrice);
    }
    setJustSaved(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;

    const newPayment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      date,
      amount: Number(amount),
      method,
      period,
      receiptNote: receiptNote.trim() || (method === 'efectivo' ? 'Cobrado en efectivo en recepción' : 'Transferencia bancaria registrada'),
      verified: true,
    };

    onSavePayment(currentMember.id, newPayment);
    setJustSaved(newPayment);
  };

  const receiptMessage = justSaved && currentMember
    ? `¡Hola ${currentMember.name}! Recibimos tu pago de ${formatCurrency(justSaved.amount)} por ${justSaved.method === 'efectivo' ? 'Efectivo 💵' : 'Transferencia 📲'} correspondiente a ${justSaved.period}. ¡Muchas gracias por seguir entrenando en GymBro! 💪`
    : '';

  const handleCopyReceipt = () => {
    if (!receiptMessage) return;
    navigator.clipboard.writeText(receiptMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="record-payment-modal"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Pago de Cuota</h2>
              <p className="text-xs text-neutral-400">Control de cobro en Efectivo o Transferencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-payment-modal"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {justSaved && currentMember ? (
          /* Success & receipt state */
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">¡Pago Registrado con Éxito!</h3>
              <p className="text-sm text-neutral-400 mt-1">
                La cuenta de <span className="text-white font-medium">{currentMember.name}</span> quedó <span className="text-emerald-400 font-semibold">Al día</span>.
              </p>
            </div>

            <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Monto cobrado:</span>
                <span className="text-lime-400 font-bold text-sm">{formatCurrency(justSaved.amount)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Método de pago:</span>
                <span className="capitalize font-medium text-neutral-200">
                  {justSaved.method === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia bancaria'}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Período:</span>
                <span className="text-neutral-200 font-medium">{justSaved.period}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Fecha:</span>
                <span className="text-neutral-200">{justSaved.date}</span>
              </div>
              {justSaved.receiptNote && (
                <div className="pt-2 border-t border-neutral-800 text-neutral-400 italic">
                  "{justSaved.receiptNote}"
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
              <a
                href={createWhatsAppLink(currentMember.phone, receiptMessage)}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-whatsapp-receipt"
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Share2 className="w-4 h-4" /> Enviar por WhatsApp
              </a>
              <button
                onClick={handleCopyReceipt}
                id="btn-copy-receipt"
                className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? '¡Copiado!' : 'Copiar Texto'}
              </button>
            </div>

            <button
              onClick={onClose}
              id="btn-done-payment-modal"
              className="text-xs text-neutral-400 hover:text-neutral-200 pt-2 underline underline-offset-4"
            >
              Cerrar ventana
            </button>
          </div>
        ) : (
          /* Payment form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Member selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Socio / Alumno
              </label>
              <select
                value={memberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                id="select-member-payment"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.planName} ({m.paymentStatus === 'al_dia' ? '🟢 Al día' : '🔴 Debe cuota'})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment method toggle: Efectivo vs Transferencia */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                ¿Cómo pagó el cliente?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('efectivo')}
                  id="btn-method-cash"
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all ${
                    method === 'efectivo'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>💵 Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('transferencia')}
                  id="btn-method-transfer"
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all ${
                    method === 'transferencia'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>📲 Transferencia</span>
                </button>
              </div>
            </div>

            {/* Amount & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Monto (₲ Guaraníes)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  id="input-payment-amount"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-semibold focus:outline-none focus:border-lime-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Período / Mes
                </label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="ej. Septiembre 2026"
                  required
                  id="input-payment-period"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Fecha del Pago
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                id="input-payment-date"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            {/* Notes / Receipt detail */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Detalle / Comprobante (opcional)
              </label>
              <input
                type="text"
                value={receiptNote}
                onChange={(e) => setReceiptNote(e.target.value)}
                placeholder={method === 'efectivo' ? 'Ej. Pagó en caja con billetes de $2.000' : 'Ej. Comprobante Mercado Pago #84920'}
                id="input-payment-note"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                id="btn-cancel-payment"
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-submit-payment"
                className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-lime-400/20"
              >
                Confirmar y Registrar Pago
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
