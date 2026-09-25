import React, { useState } from 'react';
import { Banknote, Smartphone, Plus, ArrowUpRight, Search, Share2, CheckCircle2, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { GymMember, PaymentMethod, PaymentRecord } from '../../types';
import { formatCurrency, formatDate, createWhatsAppLink } from '../../utils/storage';

interface PaymentsTrackerProps {
  members: GymMember[];
  onOpenNewPayment?: (memberId?: string) => void;
  onOpenPaymentModal?: (memberId?: string) => void;
  onOpenMessage?: (memberId: string, initialType: 'payment_reminder') => void;
  onOpenMessageModal?: (memberId: string, initialType?: any) => void;
  onConfirmApprovePayment?: (memberId: string) => void;
}

export const PaymentsTracker: React.FC<PaymentsTrackerProps> = ({
  members = [],
  onOpenNewPayment,
  onOpenPaymentModal,
  onOpenMessage,
  onOpenMessageModal,
  onConfirmApprovePayment,
}) => {
  const [filterMethod, setFilterMethod] = useState<'all' | 'efectivo' | 'transferencia' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const triggerOpenPayment = (memberId?: string) => {
    if (onOpenNewPayment) onOpenNewPayment(memberId);
    else if (onOpenPaymentModal) onOpenPaymentModal(memberId);
  };

  const triggerOpenMessage = (memberId: string, initialType: 'payment_reminder') => {
    if (onOpenMessage) onOpenMessage(memberId, initialType);
    else if (onOpenMessageModal) onOpenMessageModal(memberId, initialType);
  };

  // Collect all payments with member info
  interface EnrichedPayment extends PaymentRecord {
    memberName: string;
    memberPhone: string;
    memberPlan: string;
    memberAvatar: string;
    memberId: string;
  }

  const allPayments: EnrichedPayment[] = [];
  (members || []).forEach((m) => {
    (m.paymentsHistory || []).forEach((p) => {
      allPayments.push({
        ...p,
        memberName: m.name,
        memberPhone: m.phone,
        memberPlan: m.planName,
        memberAvatar: m.avatar,
        memberId: m.id,
      });
    });
  });

  // Sort latest first
  allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics calculation
  let totalCash = 0;
  let cashCount = 0;
  let totalTransfer = 0;
  let transferCount = 0;

  allPayments.forEach((p) => {
    if (p.method === 'efectivo') {
      totalCash += p.amount;
      cashCount++;
    } else {
      totalTransfer += p.amount;
      transferCount++;
    }
  });

  const grandTotal = totalCash + totalTransfer;
  const pendingMembers = members.filter((m) => m.paymentStatus === 'pendiente');
  const totalPendingAmount = pendingMembers.reduce((sum, m) => sum + m.planPrice, 0);
  const membersWithPendingApproval = members.filter((m) => !!m.pendingPaymentApproval);

  // Filtered payments
  const filteredPayments = allPayments.filter((p) => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.receiptNote && p.receiptNote.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterMethod === 'all') return matchesSearch;
    if (filterMethod === 'efectivo') return matchesSearch && p.method === 'efectivo';
    if (filterMethod === 'transferencia') return matchesSearch && p.method === 'transferencia';
    return matchesSearch;
  });

  return (
    <div id="payments-tracker-view" className="space-y-6">
      {/* High-priority Pending Payments from Students */}
      {membersWithPendingApproval.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl text-neutral-100 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Pagos Pendientes de Aprobación ({membersWithPendingApproval.length})
              </h3>
            </div>
            <span className="text-xs text-amber-300 font-semibold hidden sm:inline-block">
              Alumnos que informaron su pago
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {membersWithPendingApproval.map((m) => (
              <div
                key={m.id}
                className="bg-neutral-900 border border-neutral-700/80 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-10 h-10 rounded-xl object-cover border border-neutral-700 shrink-0"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate">{m.name}</h4>
                    <p className="text-[11px] text-amber-300 font-medium">
                      {m.pendingPaymentApproval?.method === 'efectivo'
                        ? '💵 Efectivo en recepción'
                        : '📲 Transferencia bancaria'}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {formatCurrency(m.planPrice)} • {m.planName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onConfirmApprovePayment
                      ? onConfirmApprovePayment(m.id)
                      : triggerOpenPayment(m.id)
                  }
                  id={`btn-approve-payment-${m.id}`}
                  className="py-2 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Aprobar y Liberar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Top Financial KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total General */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Recaudado</span>
            <ArrowUpRight className="w-4 h-4 text-lime-400" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatCurrency(grandTotal)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {allPayments.length} pagos registrados en sistema
          </p>
        </div>

        {/* Efectivo */}
        <div className="bg-neutral-900 border border-emerald-900/40 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10 text-emerald-400 text-7xl font-bold">
            💵
          </div>
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4" /> En Efectivo
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {grandTotal > 0 ? `${Math.round((totalCash / grandTotal) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(totalCash)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {cashCount} cobros físicos en recepción
          </p>
        </div>

        {/* Transferencia */}
        <div className="bg-neutral-900 border border-cyan-900/40 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10 text-cyan-400 text-7xl font-bold">
            📲
          </div>
          <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Por Transferencia
            </span>
            <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {grandTotal > 0 ? `${Math.round((totalTransfer / grandTotal) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-400 tracking-tight">
            {formatCurrency(totalTransfer)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {transferCount} transferencias bancarias / MP
          </p>
        </div>

        {/* Pendientes */}
        <div className="bg-neutral-900 border border-amber-900/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Cuotas Pendientes
            </span>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingMembers.length} socios
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(totalPendingAmount)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Por cobrar en el mes en curso
          </p>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMethod('all')}
            id="filter-pay-all"
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterMethod === 'all'
                ? 'bg-lime-400 text-neutral-950 font-bold shadow-md shadow-lime-400/20'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Todos los pagos ({allPayments.length})
          </button>

          <button
            onClick={() => setFilterMethod('efectivo')}
            id="filter-pay-cash"
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterMethod === 'efectivo'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-neutral-950 text-neutral-400 hover:text-emerald-400 border border-neutral-800'
            }`}
          >
            <Banknote className="w-4 h-4" /> Solo Efectivo ({cashCount})
          </button>

          <button
            onClick={() => setFilterMethod('transferencia')}
            id="filter-pay-transfer"
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterMethod === 'transferencia'
                ? 'bg-cyan-400 text-neutral-950 font-bold shadow-md shadow-cyan-400/20'
                : 'bg-neutral-950 text-neutral-400 hover:text-cyan-400 border border-neutral-800'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Solo Transferencia ({transferCount})
          </button>

          <button
            onClick={() => setFilterMethod('pending')}
            id="filter-pay-pending"
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterMethod === 'pending'
                ? 'bg-amber-400 text-neutral-950 font-bold shadow-md shadow-amber-400/20'
                : 'bg-neutral-950 text-neutral-400 hover:text-amber-400 border border-neutral-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Socios Morosos ({pendingMembers.length})
          </button>
        </div>

        <button
          onClick={() => triggerOpenPayment()}
          id="btn-register-payment-main"
          className="py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Registrar Cobro</span>
        </button>
      </div>

      {/* Main Table or Pending Members View */}
      {filterMethod === 'pending' ? (
        /* Pending Members List with 1-click reminders */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Socios con Cuota Pendiente de Pago
            </h3>
            <span className="text-xs text-neutral-400">
              {pendingMembers.length} socios deben abonar
            </span>
          </div>

          <div className="divide-y divide-neutral-800">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border border-neutral-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{member.name}</h4>
                      {member.pendingPaymentApproval && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold animate-pulse">
                          🔔 Notificó pago: {member.pendingPaymentApproval.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400">{member.phone} • {member.planName}</p>
                    <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                      Vencimiento: {formatDate(member.nextDueDate)} ({member.paymentMethod === 'efectivo' ? 'Paga en Efectivo' : 'Paga por Transferencia'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-base font-black text-amber-400 mr-2">
                    {formatCurrency(member.planPrice)}
                  </span>
                  <button
                    onClick={() => triggerOpenMessage(member.id, 'payment_reminder')}
                    id={`btn-remind-pending-${member.id}`}
                    className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Recordar Pago</span>
                  </button>
                  <button
                    onClick={() =>
                      member.pendingPaymentApproval && onConfirmApprovePayment
                        ? onConfirmApprovePayment(member.id)
                        : triggerOpenPayment(member.id)
                    }
                    id={`btn-charge-pending-${member.id}`}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                      member.pendingPaymentApproval
                        ? 'bg-lime-400 hover:bg-lime-300 text-neutral-950 shadow-lime-400/20 ring-2 ring-lime-400/50'
                        : 'bg-lime-400 hover:bg-lime-300 text-neutral-950 shadow-lime-400/20'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>{member.pendingPaymentApproval ? '✓ Confirmar Cobro' : 'Cobrar'}</span>
                  </button>
                </div>
              </div>
            ))}

            {pendingMembers.length === 0 && (
              <div className="p-8 text-center text-neutral-400 text-sm">
                🎉 ¡Excelente! Todos los socios están al día con sus pagos.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History of transactions */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-lime-400" />
              Libro de Cobros y Comprobantes
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en comprobantes..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/60 text-neutral-400 font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Socio / Alumno</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4">Detalle / Comprobante</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredPayments.map((payment) => {
                  const isCash = payment.method === 'efectivo';
                  const receiptMsg = `¡Hola ${payment.memberName}! Desde GymBro te enviamos el comprobante del pago de ${formatCurrency(payment.amount)} (${isCash ? 'Efectivo 💵' : 'Transferencia bancaria 📲'}) correspondiente a ${payment.period}. ¡Muchas gracias! 💪`;

                  return (
                    <tr
                      key={payment.id}
                      id={`row-payment-${payment.id}`}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-neutral-300 whitespace-nowrap">
                        {formatDate(payment.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={payment.memberAvatar}
                            alt={payment.memberName}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-lg object-cover border border-neutral-700"
                          />
                          <div>
                            <span className="font-bold text-white block">{payment.memberName}</span>
                            <span className="text-[11px] text-neutral-400">{payment.memberPlan}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                            isCash
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {isCash ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                          {isCash ? 'Efectivo 💵' : 'Transferencia 📲'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 whitespace-nowrap">
                        {payment.period}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate">
                        {payment.receiptNote || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-white text-sm whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <a
                          href={createWhatsAppLink(payment.memberPhone, receiptMsg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`btn-share-receipt-${payment.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition-colors"
                          title="Enviar comprobante por WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-400" />
                          <span>Comprobante</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPayments.length === 0 && (
              <div className="p-8 text-center text-neutral-400 text-sm">
                No hay pagos registrados para este filtro.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
