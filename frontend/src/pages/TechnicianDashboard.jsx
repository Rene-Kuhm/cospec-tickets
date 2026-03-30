import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import AppHeader from '../components/AppHeader';
import TicketForm from '../components/TicketForm';
import { MapView } from '../components/MapPicker';
import api from '../api';

const NEXT_STATUS = {
  new:        { value: 'reviewing',  label: 'Tomar reclamo',   icon: '👁',  color: 'var(--accent)' },
  reviewing:  { value: 'on_the_way', label: 'Voy en camino',   icon: '🚗',  color: '#D97706' },
  on_the_way: { value: 'resolved',   label: 'Marcar resuelto', icon: '✅',  color: '#059669' },
};

const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 };

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────
function ResolveModal({ ticket, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: '#ECFDF5' }}>
            ✅
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Resolver reclamo
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {ticket.ticket_number} — {ticket.client_name}
            </p>
          </div>
        </div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          Notas de resolución
        </label>
        <textarea
          className="w-full rounded-lg px-3.5 py-2.5 text-sm resize-none outline-none border transition"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = '#059669'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Describí lo que hiciste para resolver el problema…"
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            style={{ background: '#059669' }}
            onMouseEnter={e => e.currentTarget.style.background = '#047857'}
            onMouseLeave={e => e.currentTarget.style.background = '#059669'}>
            Confirmar resolución
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GPS Buttons ──────────────────────────────────────────────────────────────
function GpsButtons({ lat, lng, address }) {
  function url(app) {
    const addr = encodeURIComponent(`${address}, Eduardo Castex, La Pampa`);
    if (app === 'waze')
      return lat && lng
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?q=${addr}&navigate=yes`;
    return lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${addr}`;
  }
  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      <a href={url('google')} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
        🗺 Google Maps
      </a>
      <a href={url('waze')} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        style={{ background: '#FFF7ED', color: '#C2410C' }}>
        🚗 Waze
      </a>
    </div>
  );
}

// ─── History Timeline ─────────────────────────────────────────────────────────
const STATUS_CFG = {
  new:        { label: 'Nuevo',       color: '#9CA3AF', bg: '#F3F4F6' },
  reviewing:  { label: 'En Revisión', color: '#4F3FE6', bg: '#EEF0FF' },
  on_the_way: { label: 'En Camino',   color: '#D97706', bg: '#FFFBEB' },
  resolved:   { label: 'Resuelto',    color: '#059669', bg: '#ECFDF5' },
};

function Timeline({ history }) {
  if (!history?.length) return (
    <p className="text-xs italic py-2" style={{ color: 'var(--text-muted)' }}>
      Sin historial registrado
    </p>
  );
  return (
    <div className="space-y-2 mt-3">
      {history.map((h, i) => {
        const cfg = STATUS_CFG[h.new_status] || { label: h.new_status, color: '#9CA3AF', bg: '#F3F4F6' };
        return (
          <div key={i} className="flex gap-2.5 items-start">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{ background: cfg.color }} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {fmt(h.created_at)}
                </span>
              </div>
              {h.notes && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{h.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({ ticket: t, loading, onAdvance }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const next = NEXT_STATUS[t.status];

  async function toggleExpand() {
    if (!expanded && !detail) {
      const { data } = await api.get(`/tickets/${t.id}`);
      setDetail(data);
    }
    setExpanded(v => !v);
  }

  const urgentBorder = t.priority === 'urgent' ? { borderLeft: '3px solid #D92D20' } : {};
  const resolvedStyle = t.status === 'resolved' ? { opacity: 0.75 } : {};

  return (
    <div className="rounded-xl overflow-hidden transition"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        ...urgentBorder,
        ...resolvedStyle,
      }}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                {t.ticket_number}
              </span>
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
            </div>

            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {t.client_name || '—'}
            </p>

            {t.client_phone && (
              <a href={`tel:${t.client_phone}`}
                className="text-xs mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit"
                style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                📞 {t.client_phone}
              </a>
            )}
          </div>

          <button
            onClick={toggleExpand}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
            style={{
              background: expanded ? 'var(--accent-light)' : 'var(--bg-base)',
              color: expanded ? 'var(--accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>
            {expanded ? '▲' : '▼'} {expanded ? 'cerrar' : 'ver más'}
          </button>
        </div>

        {/* Address */}
        {t.client_address && (
          <div className="mt-3 p-2.5 rounded-lg"
            style={{ background: 'var(--bg-base)' }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
              Dirección
            </p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              📍 {t.client_address}
            </p>
            <GpsButtons lat={t.client_lat} lng={t.client_lng} address={t.client_address} />
          </div>
        )}

        {/* Description */}
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>

        {/* Expanded section */}
        {expanded && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <MapView lat={t.client_lat} lng={t.client_lng} />

            {t.resolution_notes && (
              <div className="mt-3 px-3 py-2.5 rounded-lg"
                style={{ background: '#ECFDF5' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#065F46' }}>
                  Notas de resolución
                </p>
                <p className="text-xs" style={{ color: '#065F46' }}>{t.resolution_notes}</p>
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>
                Historial
              </p>
              {detail ? (
                <Timeline history={detail.history} />
              ) : (
                <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>
                  Cargando historial…
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="mt-3 pt-3 flex justify-between text-xs"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <span>Creado: {fmt(t.created_at)}</span>
              {t.resolved_at && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  Resuelto: {fmt(t.resolved_at)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        {next && onAdvance && (
          <button
            onClick={() => onAdvance(t)}
            disabled={loading}
            className="mt-3 w-full text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: next.color }}
            onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            {loading ? (
              <span className="animate-pulse">Actualizando…</span>
            ) : (
              <>{next.icon} {next.label}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [resolving, setResolving] = useState(null);
  const [loading, setLoading] = useState({});
  const [showNewTicket, setShowNewTicket] = useState(false);

  async function loadTickets() {
    const { data } = await api.get('/tickets');
    setTickets(data);
  }

  useEffect(() => { loadTickets(); }, []);

  useSocket({
    'ticket:new':     (t) => { if (t.assigned_to === user.id) setTickets(prev => [t, ...prev]); },
    'ticket:updated': (t) => setTickets(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x)),
  });

  async function advance(ticket, notes = '') {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setLoading(l => ({ ...l, [ticket.id]: true }));
    try {
      await api.patch(`/tickets/${ticket.id}/status`, { status: next.value, notes });
    } finally {
      setLoading(l => ({ ...l, [ticket.id]: false }));
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const active = tickets.filter(t => t.status !== 'resolved');
    const resolvedToday = tickets.filter(t => {
      if (t.status !== 'resolved' || !t.resolved_at) return false;
      return new Date(t.resolved_at).toISOString().split('T')[0] === today;
    });
    const urgent = active.filter(t => t.priority === 'urgent');
    return { active: active.length, resolvedToday: resolvedToday.length, urgent: urgent.length };
  }, [tickets, today]);

  function handleTicketCreated(ticket) {
    setTickets(prev => [ticket, ...prev]);
    setShowNewTicket(false);
  }

  const active = useMemo(() =>
    tickets
      .filter(t => t.status !== 'resolved')
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)),
    [tickets]
  );
  const resolved = tickets.filter(t => t.status === 'resolved');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {resolving && (
        <ResolveModal
          ticket={resolving}
          onClose={() => setResolving(null)}
          onConfirm={(notes) => { advance(resolving, notes); setResolving(null); }}
        />
      )}

      <AppHeader
        section="Técnico"
        user={user}
        onLogout={logout}
        actions={
          <div className="flex items-center gap-2">
            {stats.urgent > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse"
                style={{ background: '#FFF0F0', color: '#D92D20' }}>
                🔴 {stats.urgent} urgente{stats.urgent !== 1 ? 's' : ''}
              </span>
            )}
            {active.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {active.length} asignado{active.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => setShowNewTicket(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white transition"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
              <span className="text-base leading-none">+</span> Nuevo Reclamo
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      {(active.length > 0 || resolved.length > 0) && (
        <div className="px-4 py-3 mx-4 mt-4 rounded-xl grid grid-cols-3 gap-px overflow-hidden"
          style={{ background: 'var(--border)' }}>
          {[
            { icon: '⏳', label: 'Activos',        value: stats.active,       color: '#D97706' },
            { icon: '✅', label: 'Resueltos hoy',  value: stats.resolvedToday, color: '#059669' },
            { icon: '🔴', label: 'Urgentes',        value: stats.urgent,       color: '#D92D20' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: 'var(--bg-card)' }}>
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className="text-lg font-bold tabular-nums leading-none"
                  style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`flex flex-1 ${showNewTicket ? 'max-w-3xl' : 'max-w-2xl'} mx-auto w-full px-4 py-5 gap-6`}>
        <div className={`flex-1 space-y-3 ${showNewTicket ? 'hidden' : ''}`}>
        {active.length === 0 && resolved.length === 0 ? (
          <div className="rounded-xl py-16 flex flex-col items-center text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center text-3xl"
              style={{ background: '#ECFDF5' }}>
              ✅
            </div>
            <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Sin reclamos asignados
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Todo al día por ahora
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-1">
                  <p className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>
                    Asignados a vos
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {active.length}
                  </span>
                </div>
                {active.map(t => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    loading={loading[t.id]}
                    onAdvance={(ticket) => {
                      if (NEXT_STATUS[ticket.status]?.value === 'resolved') setResolving(ticket);
                      else advance(ticket);
                    }}
                  />
                ))}
              </>
            )}

            {resolved.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-1 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>
                    Resueltos
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#ECFDF5', color: '#059669' }}>
                    {resolved.length}
                  </span>
                </div>
                {resolved.map(t => (
                  <TicketCard key={t.id} ticket={t} loading={false} onAdvance={null} />
                ))}
              </>
            )}
          </>
        )}
        </div>

        {/* New Ticket Form */}
        {showNewTicket && (
          <div className="w-full md:w-[420px] shrink-0">
            <div className="rounded-xl p-5 md:sticky md:top-5"
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
                <button onClick={() => setShowNewTicket(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
                  ✕
                </button>
              </div>
              <TicketForm onCreated={handleTicketCreated} onCancel={() => setShowNewTicket(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
