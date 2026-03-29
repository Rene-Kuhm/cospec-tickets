import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapPicker';
import api from '../api';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'reviewing', label: 'En Revisión' },
  { value: 'on_the_way', label: 'En Camino' },
  { value: 'resolved', label: 'Resueltos' },
];

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl p-4 border-l-4 ${color} shadow-sm`}>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear]   = useState(new Date().getFullYear());
  const [loadingExport, setLoadingExport] = useState(false);

  const loadTickets = useCallback(async () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const { data } = await api.get(`/tickets${params}`);
    setTickets(data);
  }, [filterStatus]);

  const loadStats = async () => {
    const { data } = await api.get('/reports/stats');
    setStats(data);
  };

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { loadStats(); api.get('/users/technicians').then(r => setTechnicians(r.data)); }, []);

  useSocket({
    'ticket:new': (t) => { setTickets(prev => [t, ...prev]); loadStats(); },
    'ticket:updated': (t) => {
      setTickets(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x));
      setSelected(prev => prev?.id === t.id ? { ...prev, ...t } : prev);
      loadStats();
    },
  });

  async function handleAssign(ticketId, techId) {
    await api.patch(`/tickets/${ticketId}/assign`, { technician_id: techId });
  }

  async function handleExport() {
    setLoadingExport(true);
    try {
      const res = await api.get(`/reports/monthly?month=${exportMonth}&year=${exportYear}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reclamos-${exportMonth}-${exportYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingExport(false);
    }
  }

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">COSPEC</span>
          <span className="text-gray-400 text-sm">/ Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <select
              className="border border-gray-200 rounded px-2 py-1 text-xs"
              value={exportMonth}
              onChange={e => setExportMonth(Number(e.target.value))}
            >
              {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <input
              type="number"
              className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
              value={exportYear}
              onChange={e => setExportYear(Number(e.target.value))}
            />
            <button
              onClick={handleExport}
              disabled={loadingExport}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {loadingExport ? 'Generando...' : '⬇ Excel'}
            </button>
          </div>
          <div className="text-sm text-gray-600">{user.name}</div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition">Salir</button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 py-4 grid grid-cols-5 gap-3">
        <StatCard label="Total reclamos" value={stats.total ?? '—'} color="border-blue-500" />
        <StatCard label="Hoy" value={stats.today ?? '—'} color="border-indigo-500" />
        <StatCard label="Resueltos hoy" value={stats.resolved_today ?? '—'} color="border-green-500" />
        <StatCard label="Pendientes" value={stats.pending ?? '—'} color="border-yellow-500" />
        <StatCard label="Urgentes activos" value={stats.urgent ?? '—'} color="border-red-500" />
      </div>

      {/* Main */}
      <div className="flex flex-1 px-6 pb-6 gap-4 overflow-hidden">
        {/* Ticket list */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-700">Reclamos</span>
            <div className="flex gap-1 ml-auto">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    filterStatus === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {tickets.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Sin reclamos</div>
            ) : (
              tickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${selected?.id === t.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{t.client_name || '—'}</p>
                      <p className="text-xs text-gray-500 truncate">{t.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('es-AR')}</p>
                      {t.assigned_name && (
                        <p className="text-xs text-blue-600 mt-0.5">{t.assigned_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-700">{selected.ticket_number}</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
                <p className="text-sm font-medium text-gray-800">{selected.client_name || '—'}</p>
                {selected.client_phone && <p className="text-xs text-gray-500">{selected.client_phone}</p>}
              </div>

              {selected.client_address && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dirección</p>
                  <p className="text-sm text-gray-700">{selected.client_address}</p>
                </div>
              )}

              <MapView lat={selected.client_lat} lng={selected.client_lng} />

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reclamo</p>
                <p className="text-sm text-gray-700">{selected.description}</p>
              </div>

              {selected.resolution_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Resolución</p>
                  <p className="text-sm text-gray-700">{selected.resolution_notes}</p>
                </div>
              )}

              {/* Assign technician */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Asignar Técnico</p>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  value={selected.assigned_to || ''}
                  onChange={e => handleAssign(selected.id, e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                <p>Cargado por: {selected.created_by_name}</p>
                <p>Fecha: {new Date(selected.created_at).toLocaleString('es-AR')}</p>
                {selected.resolved_at && (
                  <p>Resuelto: {new Date(selected.resolved_at).toLocaleString('es-AR')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
