import React, { useState } from 'react';
import { MessageSquare, AlertTriangle, Smile, Heart, Dumbbell, Send, Share2, Plus, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { GymMember, GymMessage } from '../../types';
import { createWhatsAppLink, formatDate } from '../../utils/storage';

interface MessagingCenterProps {
  members: GymMember[];
  onOpenMessageModal: (memberId?: string, initialType?: any) => void;
  onSendMessageDirect: (memberId: string, message: GymMessage) => void;
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({
  members,
  onOpenMessageModal,
  onSendMessageDirect,
}) => {
  const [activeTab, setActiveTab] = useState<'absent' | 'payments' | 'support' | 'all_sent'>('absent');

  // Groups
  const absentMembers = members.filter((m) => m.daysAbsent > 1);
  const pendingMembers = members.filter((m) => m.paymentStatus === 'pendiente');
  const tiredMembers = members.filter((m) => m.todayMood === 'cansado' || m.todayMood === 'adolorido' || m.todayMood === 'desmotivado');

  // Collect all sent messages across members
  interface SentMessageItem extends GymMessage {
    recipientName: string;
    recipientPhone: string;
    recipientAvatar: string;
    memberId: string;
  }
  const allSentMessages: SentMessageItem[] = [];
  (members || []).forEach((m) => {
    (m.messages || []).forEach((msg) => {
      allSentMessages.push({
        ...msg,
        recipientName: m.name,
        recipientPhone: m.phone,
        recipientAvatar: m.avatar,
        memberId: m.id,
      });
    });
  });

  return (
    <div id="messaging-center-view" className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-lime-400" />
            Centro de Mensajes, Avisos y Motivación
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Mantené a tus alumnos comprometidos: cobros, avisos de faltas con humor y apoyo motivacional.
          </p>
        </div>

        <button
          onClick={() => onOpenMessageModal()}
          id="btn-new-custom-message"
          className="py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-400/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Redactar Mensaje</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => setActiveTab('absent')}
          id="tab-absent-feed"
          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            activeTab === 'absent'
              ? 'bg-purple-500/15 border-purple-500 text-purple-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <Smile className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              {absentMembers.length}
            </span>
          </div>
          <span className="text-xs font-bold text-white mt-1">Ausentes / Broma GymBro</span>
          <span className="text-[11px] text-neutral-400">Mensajes divertidos para que vuelvan</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          id="tab-payments-feed"
          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            activeTab === 'payments'
              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {pendingMembers.length}
            </span>
          </div>
          <span className="text-xs font-bold text-white mt-1">Recordatorios de Cuota</span>
          <span className="text-[11px] text-neutral-400">Aviso cordial con método de pago</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          id="tab-support-feed"
          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            activeTab === 'support'
              ? 'bg-rose-500/15 border-rose-500 text-rose-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
              {tiredMembers.length}
            </span>
          </div>
          <span className="text-xs font-bold text-white mt-1">Apoyo & Motivación</span>
          <span className="text-[11px] text-neutral-400">Para quienes se sienten con dolor o fatiga</span>
        </button>

        <button
          onClick={() => setActiveTab('all_sent')}
          id="tab-sent-feed"
          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            activeTab === 'all_sent'
              ? 'bg-lime-400/15 border-lime-400 text-lime-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <Send className="w-4 h-4 text-lime-400" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
              {allSentMessages.length}
            </span>
          </div>
          <span className="text-xs font-bold text-white mt-1">Historial Enviados</span>
          <span className="text-[11px] text-neutral-400">Bandeja general de notificaciones</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {activeTab === 'absent' && (
          <div>
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smile className="w-4 h-4 text-purple-400" />
                  Alumnos Ausentes (¡Enviá un mensaje gracioso!)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Una broma con cariño en WhatsApp reactiva a los alumnos más rápido que cualquier multa.
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-800">
              {absentMembers.map((member) => {
                const funnyTemplate = `¡Hola ${member.name}! 🚨 Llevás ${member.daysAbsent} días sin aparecer por GymBro. Las mancuernas están con crisis de abandono y las máquinas ya te están guardando el turno 😂 ¡Vení hoy que el músculo se extraña! Te esperamos en el salón 💪`;
                return (
                  <div
                    key={member.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{member.name}</h4>
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[11px] font-bold">
                            {member.daysAbsent} días sin asistir
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Última vez: {member.lastAttended} • Meta: {member.goal}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={createWhatsAppLink(member.phone, funnyTemplate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Bromear por WhatsApp</span>
                      </a>
                      <button
                        onClick={() => onOpenMessageModal(member.id, 'absent_funny')}
                        className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>Personalizar</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {absentMembers.length === 0 && (
                <div className="p-10 text-center text-neutral-400 text-sm">
                  🎉 ¡Genial! Todos los alumnos han venido al gimnasio recientemente.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Socios con Cuota Pendiente de Renovación
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Recordatorio cordial indicando si suele abonar en efectivo o por transferencia bancaria.
              </p>
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
                      className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{member.name}</h4>
                        <span className="text-xs font-bold text-amber-400">
                          ${member.planPrice.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Paga habitual: <span className="text-neutral-200 font-medium">{member.paymentMethod === 'efectivo' ? '💵 Efectivo en recepción' : '📲 Transferencia'}</span> • Venció: {formatDate(member.nextDueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onOpenMessageModal(member.id, 'payment_reminder')}
                      className="py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-400/20"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Recordar Cuota</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingMembers.length === 0 && (
                <div className="p-10 text-center text-neutral-400 text-sm">
                  ✨ No hay socios con cuotas pendientes en este momento.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div>
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                Alumnos que Reportaron Cansancio o Dolor
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                La empatía marca la diferencia: ofreceles movilidad suave o palabras de ánimo para que no abandonen.
              </p>
            </div>

            <div className="divide-y divide-neutral-800">
              {tiredMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{member.name}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-[11px] font-bold">
                          Estado: {member.todayMood === 'cansado' ? '🥱 Cansado' : member.todayMood === 'adolorido' ? '🤕 Con dolor muscular' : '🏠 Desmotivado'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {member.injuriesNotes ? `Cuidado: ${member.injuriesNotes}` : 'Meta: ' + member.goal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onOpenMessageModal(member.id, 'support_motivational')}
                      className="py-2 px-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>Enviar Apoyo y Ánimo</span>
                    </button>
                  </div>
                </div>
              ))}

              {tiredMembers.length === 0 && (
                <div className="p-10 text-center text-neutral-400 text-sm">
                  💪 Todos los alumnos reportaron sentirse con energía hoy.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'all_sent' && (
          <div>
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-lime-400" />
                Historial de Mensajes y Notificaciones
              </h3>
            </div>

            <div className="divide-y divide-neutral-800">
              {allSentMessages.map((msg) => (
                <div key={msg.id} className="p-4 flex items-start gap-3 hover:bg-neutral-800/30 transition-colors">
                  <img
                    src={msg.recipientAvatar}
                    alt={msg.recipientName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl object-cover border border-neutral-700 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-white text-xs">
                        Para {msg.recipientName} <span className="text-neutral-400 font-normal">({msg.title})</span>
                      </h4>
                      <span className="text-[11px] text-neutral-500 whitespace-nowrap">{msg.date}</span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
                      "{msg.content}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
