import React, { useState } from 'react';
import { Scale, Plus, TrendingDown, TrendingUp, Calendar, ArrowRight, Check } from 'lucide-react';
import { WeightMetric } from '../../types';
import { formatDate } from '../../utils/storage';

interface WeightTrackerProps {
  weightHistory: WeightMetric[];
  onAddWeight: (weight: WeightMetric) => void;
}

export const WeightTracker: React.FC<WeightTrackerProps> = ({ weightHistory = [], onAddWeight }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState<number>(75);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');

  const safeWeights = Array.isArray(weightHistory) ? weightHistory : [];
  const sortedWeights = [...safeWeights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const initialWeight = sortedWeights.length > 0 ? sortedWeights[0]?.weightKg : undefined;
  const currentWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1]?.weightKg : undefined;
  const delta = currentWeight && initialWeight ? Number((currentWeight - initialWeight).toFixed(1)) : 0;

  const minWeight = sortedWeights.length > 0 ? Math.min(...sortedWeights.map((w) => w.weightKg)) - 1 : 60;
  const maxWeight = sortedWeights.length > 0 ? Math.max(...sortedWeights.map((w) => w.weightKg)) + 1 : 90;
  const range = maxWeight - minWeight || 1;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;

    onAddWeight({
      id: `w_${Date.now()}`,
      date: newDate,
      weightKg: Number(newWeight),
      note: newNote.trim() || undefined,
    });
    setShowAddModal(false);
    setNewNote('');
  };

  return (
    <div id="client-weight-tracker" className="space-y-6">
      {/* Top Weight KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Peso Inicial
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            {initialWeight ? `${initialWeight} kg` : '—'}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            {sortedWeights[0] ? formatDate(sortedWeights[0].date) : ''}
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Peso Actual
          </span>
          <span className="text-xl font-black text-lime-400 mt-1 block">
            {currentWeight ? `${currentWeight} kg` : '—'}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            {sortedWeights[sortedWeights.length - 1] ? formatDate(sortedWeights[sortedWeights.length - 1].date) : ''}
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Variación Neta
          </span>
          <div className="flex items-center justify-center gap-1 mt-1">
            {delta > 0 ? (
              <TrendingUp className="w-4 h-4 text-lime-400" />
            ) : delta < 0 ? (
              <TrendingDown className="w-4 h-4 text-cyan-400" />
            ) : null}
            <span className={`text-xl font-black ${delta > 0 ? 'text-lime-400' : delta < 0 ? 'text-cyan-400' : 'text-neutral-300'}`}>
              {delta > 0 ? `+${delta}` : delta} kg
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            {delta > 0 ? 'Masa / Superávit' : delta < 0 ? 'Déficit / Grasa' : 'Estable'}
          </span>
        </div>
      </div>

      {/* Interactive SVG Line Graph */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-lime-400" />
            <h3 className="font-bold text-sm text-white">Evolución de Peso Corporal</h3>
          </div>

          <button
            onClick={() => {
              setNewWeight(currentWeight || 75);
              setShowAddModal(true);
            }}
            id="btn-open-log-weight"
            className="py-1.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Registrar Peso</span>
          </button>
        </div>

        {/* SVG Chart */}
        {sortedWeights.length > 1 ? (
          <div className="w-full pt-2 pb-1">
            <div className="h-48 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A3E635" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A3E635" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={160 - pct * 140}
                    x2="600"
                    y2={160 - pct * 140}
                    stroke="#262626"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Area path */}
                {(() => {
                  const points = sortedWeights.map((w, idx) => {
                    const x = (idx / (sortedWeights.length - 1)) * 560 + 20;
                    const y = 160 - ((w.weightKg - minWeight) / range) * 130;
                    return { x, y, ...w };
                  });

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                  return (
                    <>
                      <path d={areaPath} fill="url(#weightGrad)" />
                      <path d={linePath} fill="none" stroke="#A3E635" strokeWidth="3" strokeLinecap="round" />
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#0A0A0A" stroke="#A3E635" strokeWidth="2.5" />
                          <text
                            x={p.x}
                            y={p.y - 12}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            {p.weightKg} kg
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Date axis labels */}
            <div className="flex justify-between text-[11px] text-neutral-500 pt-3 px-2 border-t border-neutral-800/80">
              {sortedWeights.map((w, i) => (
                <span key={i} className="text-center">
                  {formatDate(w.date)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-950/60 rounded-xl border border-neutral-800">
            Registrá al menos dos pesajes para visualizar tu gráfico de progreso.
          </div>
        )}
      </div>

      {/* Historical List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Historial de Pesajes
        </h4>

        <div className="divide-y divide-neutral-800">
          {[...sortedWeights].reverse().map((entry) => (
            <div key={entry.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 text-lime-400 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-sm">{entry.weightKg} kg</span>
                  {entry.note && <span className="text-neutral-400 block text-[11px]">{entry.note}</span>}
                </div>
              </div>
              <span className="text-neutral-500 font-mono">{formatDate(entry.date)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Weight Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Scale className="w-4 h-4 text-lime-400" />
                Registrar Nuevo Pesaje
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Peso Corporal (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(Number(e.target.value))}
                  required
                  autoFocus
                  id="input-new-weight-val"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-lg font-black text-lime-400 focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  id="input-new-weight-date"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Nota / Momento del día (opcional)
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ej: En ayunas, antes de entrenar..."
                  id="input-new-weight-note"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-new-weight"
                  className="flex-1 py-2.5 rounded-xl bg-lime-400 text-neutral-950 font-bold text-xs hover:bg-lime-300 shadow-md shadow-lime-400/20"
                >
                  Guardar Pesaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
