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

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_TIMELINE = {
  new:        { label: 'Nuevo',       color: '#9CA3AF', bg: '#F3F4F6' },
  reviewing:  { label: 'En Revisión', color: '#4F3FE6', bg: '#EEF0FF' },
  on_the_way: { label: 'En Camino',   color: '#D97706', bg: '#FFFBEB' },
  resolved:   { label: 'Resuelto',    color: '#059669', bg: '#ECFDF5' },
};

function fmt(dateStr, opts = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  });
}

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub, icon }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {icon && (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
          style={{ background: accent ? `${accent}18` : 'var(--bg-base)' }}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-tight"
          style={{ color: accent || 'var(--text-primary)' }}>
          {value ?? '—'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {sub != null && (
          <p className="text-xs mt-1 font-medium" style={{ color: accent || 'var(--text-secondary)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Technician Workload ──────────────────────────────────────────────────────
function TechnicianWorkload({ technicians }) {
  if (!technicians?.length) return null;
  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}>
        Carga de Técnicos
      </p>
      <div className="space-y-3">
        {technicians.map(t => (
          <div key={t.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ background: 'var(--accent)' }}>
                  {t.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {t.active > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#FFF7ED', color: '#C2410C' }}>
                    {t.active} activo{t.active !== 1 ? 's' : ''}
                  </span>
                )}
                {t.resolved_today > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#ECFDF5', color: '#059669' }}>
                    ✓ {t.resolved_today} hoy
                  </span>
                )}
              </div>
            </div>
            {/* Load bar */}
            <div className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-base)' }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (t.active / Math.max(1, t.total_assigned)) * 100)}%`,
                  background: t.active > 3 ? '#D92D20' : t.active > 1 ? '#D97706' : '#059669',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ticket Timeline ──────────────────────────────────────────────────────────
function TicketTimeline({ history }) {
  if (!history?.length) {
    return (
      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
        Sin historial aún
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {history.map((h, i) => {
        const cfg = STATUS_TIMELINE[h.new_status] || { label: h.new_status, color: '#9CA3AF', bg: '#F3F4F6' };
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                style={{ background: cfg.color }} />
              {i < history.length - 1 && (
                <div className="w-px flex-1 mt-1" style={{ background: 'var(--border)' }} />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  por {h.changed_by_name || '—'}
                </span>
              </div>
              {h.notes && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{h.notes}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {fmt(h.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ ticket, technicians, onClose, onAssign }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    setDetail(null);
    setTab('info');
    api.get(`/tickets/${ticket.id}`).then(r => setDetail(r.data));
  }, [ticket.id]);

  const t = detail || ticket;

  return (
    <div className="w-80 rounded-xl overflow-y-auto shrink-0 flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t.ticket_number}
          </span>
          <StatusBadge status={t.status} />
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none transition"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {['info', 'historial'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className="flex-1 py-2.5 text-xs font-semibold capitalize transition"
            style={{
              color: tab === t2 ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t2 ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            {t2}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 p-4">
        {tab === 'info' ? (
          <div className="space-y-4">
            {/* Priority */}
            <PriorityBadge priority={t.priority} />

            {/* Client */}
            <Section label="Cliente">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t.client_name || '—'}
              </p>
              {t.client_phone && (
                <a href={`tel:${t.client_phone}`}
                  className="text-xs mt-1 flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg transition"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                  📞 {t.client_phone}
                </a>
              )}
            </Section>

            {/* Address + Map */}
            {t.client_address && (
              <Section label="Dirección">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.client_address}</p>
              </Section>
            )}
            <MapView lat={t.client_lat} lng={t.client_lng} />

            {/* Description */}
            <Section label="Descripción">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
            </Section>

            {/* Resolution */}
            {t.resolution_notes && (
              <Section label="Notas de resolución">
                <p className="text-sm px-3 py-2.5 rounded-lg"
                  style={{ background: '#ECFDF5', color: '#065F46' }}>
                  {t.resolution_notes}
                </p>
              </Section>
            )}

            {/* Assign */}
            <Section label="Técnico asignado">
              <select
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                value={t.assigned_to || ''}
                onChange={e => onAssign(t.id, e.target.value)}>
                <option value="">Sin asignar</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </Section>

            {/* Meta */}
            <div className="pt-3 text-xs space-y-1.5"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <div className="flex justify-between">
                <span>Cargado por</span>
                <span style={{ color: 'var(--text-secondary)' }}>{t.created_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Creado</span>
                <span style={{ color: 'var(--text-secondary)' }}>{fmt(t.created_at)}</span>
              </div>
              {t.resolved_at && (
                <div className="flex justify-between">
                  <span>Resuelto</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{fmt(t.resolved_at)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}>
              Historial de cambios
            </p>
            {detail ? (
              <TicketTimeline history={detail.history} />
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cargando…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Technician Manager Modal ─────────────────────────────────────────────────
function TechnicianModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [phones, setPhones] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    api.get('/users').then(r => {
      const techs = r.data.filter(u => u.role === 'technician');
      setUsers(techs);
      const map = {};
      techs.forEach(u => { map[u.id] = u.phone || ''; });
      setPhones(map);
    });
  }, []);

  async function savePhone(id) {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await api.patch(`/users/${id}/phone`, { phone: phones[id] });
      setSaved(s => ({ ...s, [id]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000);
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Gestión de Técnicos
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Configurá los teléfonos para notificaciones WhatsApp
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
            ×
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl flex items-start gap-3"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <span className="text-base shrink-0 mt-0.5">📱</span>
          <p className="text-xs" style={{ color: '#92400E' }}>
            Formato internacional sin el <strong>+</strong>: ej <code>5492954123456</code> para un número de La Pampa (549 + código de área sin 0 + número)
          </p>
        </div>

        {/* List */}
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
              Cargando…
            </p>
          ) : users.map(u => (
            <div key={u.id} className="rounded-xl p-3.5"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'var(--accent)' }}>
                  {u.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="5492954XXXXXXX"
                  value={phones[u.id] ?? ''}
                  onChange={e => setPhones(p => ({ ...p, [u.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition font-mono"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  onKeyDown={e => e.key === 'Enter' && savePhone(u.id)}
                />
                <button
                  onClick={() => savePhone(u.id)}
                  disabled={saving[u.id]}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: saved[u.id] ? '#059669' : 'var(--accent)', minWidth: 72 }}>
                  {saving[u.id] ? '…' : saved[u.id] ? '✓ Listo' : 'Guardar'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [loadingExport, setLoadingExport] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);

  const loadTickets = useCallback(async () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const { data } = await api.get(`/tickets${params}`);
    setTickets(data);
  }, [filterStatus]);

  const loadStats = useCallback(async () => {
    const { data } = await api.get('/reports/stats');
    setStats(data);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => {
    loadStats();
    api.get('/users/technicians').then(r => setTechnicians(r.data));
  }, [loadStats]);

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
      const res = await api.get(
        `/reports/monthly?month=${exportMonth}&year=${exportYear}`,
        { responseType: 'blob' }
      );
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

  const filtered = tickets.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.client_name?.toLowerCase().includes(q) ||
      t.ticket_number?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.client_address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {showTechModal && <TechnicianModal onClose={() => setShowTechModal(false)} />}
      <AppHeader
        section="Administración"
        user={user}
        onLogout={logout}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTechModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              👥 Técnicos
            </button>
            <select
              className="text-xs px-2.5 py-1.5 rounded-lg border outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              value={exportMonth}
              onChange={e => setExportMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
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
              onMouseLeave={e => e.currentTarget.style.background = '#059669'}>
              {loadingExport ? 'Generando...' : '⬇ Excel'}
            </button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="px-6 pt-4 pb-2 grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard icon="📋" label="Total reclamos"   value={stats.total}          accent="var(--text-primary)" />
        <StatCard icon="🆕" label="Creados hoy"      value={stats.today}          accent="var(--accent)" />
        <StatCard icon="✅" label="Resueltos hoy"    value={stats.resolved_today} accent="#059669" />
        <StatCard icon="⏳" label="Pendientes"       value={stats.pending}        accent="#D97706" />
        <StatCard icon="🚗" label="En camino"        value={stats.by_status?.on_the_way ?? 0} accent="#7C3AED" />
        <StatCard icon="🔴" label="Urgentes activos" value={stats.urgent}         accent="#D92D20" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 px-6 pb-6 gap-4 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Ticket list */}
        <div className="flex-1 rounded-xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* Toolbar */}
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap"
            style={{ borderBottom: '1px solid var(--border)' }}>
            {/* Search */}
            <div className="relative flex-1 min-w-40">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar cliente, ticket, dirección…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none transition"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            {/* Status filters */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition"
                  style={
                    filterStatus === opt.value
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--bg-base)', color: 'var(--text-secondary)' }
                  }>
                  {opt.label}
                  {opt.value && stats.by_status?.[opt.value] != null && (
                    <span className="ml-1 opacity-70">({stats.by_status[opt.value]})</span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} reclamo{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Column headers */}
          <div className="grid px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '100px 1fr 140px 120px 110px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)',
              background: 'var(--bg-base)',
            }}>
            <span>Ticket</span>
            <span>Cliente / Descripción</span>
            <span>Estado</span>
            <span>Técnico</span>
            <span className="text-right">Fecha</span>
          </div>

          {/* Rows */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm"
                style={{ color: 'var(--text-muted)' }}>
                {search ? `Sin resultados para "${search}"` : 'Sin reclamos'}
              </div>
            ) : (
              filtered.map(t => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  selected={selected?.id === t.id}
                  onClick={() => setSelected(s => s?.id === t.id ? null : t)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {selected ? (
            <DetailPanel
              ticket={selected}
              technicians={technicians}
              onClose={() => setSelected(null)}
              onAssign={handleAssign}
            />
          ) : (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Seleccioná un reclamo
                </span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  para ver detalles, historial y asignar técnico
                </p>
              </div>
              {stats.technicians?.length > 0 && (
                <TechnicianWorkload technicians={stats.technicians} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Row ────────────────────────────────────────────────────────────────
function TicketRow({ ticket: t, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className="grid px-4 py-3 cursor-pointer transition items-center"
      style={{
        gridTemplateColumns: '100px 1fr 140px 120px 110px',
        borderBottom: '1px solid var(--border)',
        background: selected ? 'var(--accent-light)' : 'transparent',
        borderLeft: selected ? '3px solid var(--accent)' : '3px solid transparent',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-base)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Ticket # */}
      <div>
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
          {t.ticket_number}
        </p>
        <PriorityBadge priority={t.priority} />
      </div>

      {/* Client + description */}
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {t.client_name || '—'}
        </p>
        {t.client_address && (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            📍 {t.client_address}
          </p>
        )}
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {t.description}
        </p>
      </div>

      {/* Status */}
      <div>
        <StatusBadge status={t.status} />
      </div>

      {/* Technician */}
      <div>
        {t.assigned_name ? (
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {t.assigned_name}
          </span>
        ) : (
          <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
            Sin asignar
          </span>
        )}
      </div>

      {/* Date */}
      <div className="text-right">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {fmtShort(t.created_at)}
        </p>
        {t.resolved_at && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#059669' }}>
            ✓ {fmtShort(t.resolved_at)}
          </p>
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
