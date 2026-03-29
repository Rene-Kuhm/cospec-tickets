import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import AppHeader from '../components/AppHeader';
import { MapView } from '../components/MapPicker';
import api from '../api';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'reviewing', label: 'En Revisión' },
  { value: 'on_the_way', label: 'En Camino' },
  { value: 'resolved', label: 'Resueltos' },
];

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent || 'var(--text-primary)' }}>
        {value ?? '—'}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
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
  useEffect(() => {
    loadStats();
    api.get('/users/technicians').then(r => setTechnicians(r.data));
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <AppHeader
        section="Administración"
        user={user}
        onLogout={logout}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="text-xs px-2.5 py-1.5 rounded-lg border outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              value={exportMonth}
              onChange={e => setExportMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <input
              type="number"
              className="w-20 text-xs px-2.5 py-1.5 rounded-lg border outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              value={exportYear}
              onChange={e => setExportYear(Number(e.target.value))}
            />
            <button
              onClick={handleExport}
              disabled={loadingExport}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition"
              style={{ background: '#059669' }}
              onMouseEnter={e => e.currentTarget.style.background = '#047857'}
              onMouseLeave={e => e.currentTarget.style.background = '#059669'}
            >
              {loadingExport ? 'Generando...' : '⬇ Excel'}
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total reclamos"  value={stats.total}          accent="var(--text-primary)" />
        <StatCard label="Creados hoy"     value={stats.today}          accent="var(--accent)" />
        <StatCard label="Resueltos hoy"   value={stats.resolved_today} accent="#059669" />
        <StatCard label="Pendientes"      value={stats.pending}        accent="#D97706" />
        <StatCard label="Urgentes activos" value={stats.urgent}        accent="#D92D20" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 px-6 pb-6 gap-4 overflow-hidden">
        {/* Ticket list */}
        <div className="flex-1 rounded-xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* Filters */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold mr-1" style={{ color: 'var(--text-primary)' }}>
              Reclamos
            </span>
            <div className="flex gap-1 ml-auto flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition"
                  style={
                    filterStatus === opt.value
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--bg-base)', color: 'var(--text-secondary)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {tickets.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-muted)' }}>
                Sin reclamos
              </div>
            ) : (
              tickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="px-4 py-3 cursor-pointer transition"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: selected?.id === t.id ? 'var(--accent-light)' : 'transparent',
                    borderLeft: selected?.id === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.background = 'var(--bg-base)'; }}
                  onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {t.ticket_number}
                        </span>
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {t.client_name || '—'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {t.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(t.created_at).toLocaleDateString('es-AR')}
                      </p>
                      {t.assigned_name && (
                        <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--accent)' }}>
                          {t.assigned_name}
                        </p>
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
          <div className="w-80 rounded-xl overflow-y-auto shrink-0"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                {selected.ticket_number}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none transition"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>

              <Section label="Cliente">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {selected.client_name || '—'}
                </p>
                {selected.client_phone && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    📞 {selected.client_phone}
                  </p>
                )}
              </Section>

              {selected.client_address && (
                <Section label="Dirección">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selected.client_address}
                  </p>
                </Section>
              )}

              <MapView lat={selected.client_lat} lng={selected.client_lng} />

              <Section label="Descripción del reclamo">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>
              </Section>

              {selected.resolution_notes && (
                <Section label="Resolución">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.resolution_notes}</p>
                </Section>
              )}

              <Section label="Asignar Técnico">
                <select
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  value={selected.assigned_to || ''}
                  onChange={e => handleAssign(selected.id, e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Section>

              <div className="pt-2 text-xs space-y-0.5" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
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

function Section({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {children}
    </div>
  );
}
