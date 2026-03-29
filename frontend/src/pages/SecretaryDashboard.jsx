import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import AppHeader from '../components/AppHeader';
import TicketForm from '../components/TicketForm';
import api from '../api';

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
        style={{ background: accent ? `${accent}18` : 'var(--bg-base)' }}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums leading-tight"
          style={{ color: accent || 'var(--text-primary)' }}>
          {value ?? 0}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

export default function SecretaryDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  async function loadTickets() {
    const { data } = await api.get('/tickets');
    setTickets(data);
  }

  useEffect(() => { loadTickets(); }, []);

  useSocket({
    'ticket:new':     (t) => setTickets(prev => [t, ...prev]),
    'ticket:updated': (t) => setTickets(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x)),
  });

  function handleCreated(ticket) {
    setTickets(prev => [ticket, ...prev]);
    setShowForm(false);
  }

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const active = tickets.filter(t => t.status !== 'resolved').length;
    const resolvedToday = tickets.filter(t => {
      if (t.status !== 'resolved' || !t.resolved_at) return false;
      const d = new Date(t.resolved_at).toISOString().split('T')[0];
      return d === today;
    }).length;
    return { total: tickets.length, active, resolvedToday };
  }, [tickets, today]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (filterStatus === 'active') list = list.filter(t => t.status !== 'resolved');
    else if (filterStatus === 'resolved') list = list.filter(t => t.status === 'resolved');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.client_name?.toLowerCase().includes(q) ||
        t.ticket_number?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.client_address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, filterStatus, search]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <AppHeader
        section="Secretaría"
        user={user}
        onLogout={logout}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <span className="text-base leading-none">+</span> Nuevo Reclamo
          </button>
        }
      />

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-6 py-5 gap-6">
        {/* Left: list */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon="📋" label="Total reclamos" value={stats.total}       accent="var(--text-primary)" />
            <StatCard icon="⏳" label="Activos"         value={stats.active}      accent="#D97706" />
            <StatCard icon="✅" label="Resueltos hoy"  value={stats.resolvedToday} accent="#059669" />
          </div>

          {/* Toolbar */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
              {/* Filters */}
              <div className="flex gap-1">
                {[
                  { value: 'active',   label: `Activos (${stats.active})` },
                  { value: 'resolved', label: 'Resueltos' },
                  { value: 'all',      label: 'Todos' },
                ].map(opt => (
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
                  </button>
                ))}
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Column headers */}
            <div className="grid px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '90px 1fr 150px 120px 100px',
                color: 'var(--text-muted)',
                background: 'var(--bg-base)',
                borderBottom: '1px solid var(--border)',
              }}>
              <span>Ticket</span>
              <span>Cliente / Dirección</span>
              <span>Estado</span>
              <span>Técnico</span>
              <span className="text-right">Fecha</span>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <EmptyState onNew={() => setShowForm(true)} search={search} />
            ) : (
              filtered.map(t => (
                <TicketRow key={t.id} ticket={t} />
              ))
            )}
          </div>
        </div>

        {/* Right: form */}
        {showForm && (
          <div className="w-[420px] shrink-0">
            <div className="rounded-xl p-5 sticky top-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Nuevo Reclamo
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Completá los datos del cliente
                  </p>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
                  ✕
                </button>
              </div>
              <TicketForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket: t }) {
  return (
    <div
      className="grid px-4 py-3 transition items-center"
      style={{
        gridTemplateColumns: '90px 1fr 150px 120px 100px',
        borderBottom: '1px solid var(--border)',
        borderLeft: t.priority === 'urgent' ? '3px solid #D92D20' : '3px solid transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Ticket # + priority */}
      <div>
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
          {t.ticket_number}
        </p>
        <div className="mt-1">
          <PriorityBadge priority={t.priority} />
        </div>
      </div>

      {/* Client */}
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {t.client_name || '—'}
        </p>
        {t.client_phone && (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            📞 {t.client_phone}
          </p>
        )}
        {t.client_address && (
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
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
            🔧 {t.assigned_name}
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

function EmptyState({ onNew, search }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
        style={{ background: 'var(--accent-light)' }}>
        <span className="text-2xl">{search ? '🔍' : '📋'}</span>
      </div>
      {search ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sin resultados para "{search}"
        </p>
      ) : (
        <>
          <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            Sin reclamos aún
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Creá el primer reclamo para comenzar
          </p>
          <button
            onClick={onNew}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: 'var(--accent)' }}>
            + Nuevo Reclamo
          </button>
        </>
      )}
    </div>
  );
}
