import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import AppHeader from '../components/AppHeader';
import { MapView } from '../components/MapPicker';
import api from '../api';

const NEXT_STATUS = {
  new:        { value: 'reviewing',  label: 'Tomar reclamo',  icon: '👁' },
  reviewing:  { value: 'on_the_way', label: 'Voy en camino',  icon: '🚗' },
  on_the_way: { value: 'resolved',   label: 'Marcar resuelto', icon: '✅' },
};

function ResolveModal({ ticket, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
          Resolver reclamo
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {ticket.ticket_number} — {ticket.client_name}
        </p>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Notas de resolución
        </label>
        <textarea
          className="w-full rounded-lg px-3.5 py-2.5 text-sm resize-none outline-none border transition"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Descripción de lo que se hizo..."
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            style={{ background: '#059669' }}
            onMouseEnter={e => e.currentTarget.style.background = '#047857'}
            onMouseLeave={e => e.currentTarget.style.background = '#059669'}
          >
            Confirmar resolución
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function GpsButton({ lat, lng, address }) {
  function buildUrl(app) {
    if (app === 'waze') {
      return lat && lng
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(address + ', Eduardo Castex, La Pampa')}&navigate=yes`;
    }
    return lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Eduardo Castex, La Pampa')}`;
  }

  return (
    <div className="flex gap-1.5 mt-2">
      <a href={buildUrl('google')} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition"
        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
        🗺 Google Maps
      </a>
      <a href={buildUrl('waze')} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition"
        style={{ background: '#FFF7ED', color: '#C2410C' }}>
        🚗 Waze
      </a>
    </div>
  );
}

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [resolving, setResolving] = useState(null);
  const [loading, setLoading] = useState({});

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

  const active   = tickets.filter(t => t.status !== 'resolved');
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
          active.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {active.length} activos
            </span>
          )
        }
      />

      <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-3">
        {active.length === 0 && resolved.length === 0 ? (
          <div className="rounded-xl py-16 flex flex-col items-center text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl"
              style={{ background: '#ECFDF5' }}>
              ✅
            </div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Sin reclamos asignados
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Todo al día por ahora
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider px-1"
                  style={{ color: 'var(--text-muted)' }}>
                  Asignados a vos
                </p>
                {active.map(t => (
                  <TicketCard key={t.id} ticket={t} loading={loading[t.id]}
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
                <p className="text-xs font-semibold uppercase tracking-wider px-1 pt-2"
                  style={{ color: 'var(--text-muted)' }}>
                  Resueltos hoy
                </p>
                {resolved.map(t => <TicketCard key={t.id} ticket={t} loading={false} onAdvance={null} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket: t, loading, onAdvance }) {
  const [expanded, setExpanded] = useState(false);
  const next = NEXT_STATUS[t.status];

  const urgentStyle = t.priority === 'urgent'
    ? { borderLeft: '3px solid #D92D20' }
    : {};

  return (
    <div className="rounded-xl overflow-hidden transition"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', ...urgentStyle }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
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
                className="text-xs mt-0.5 inline-block"
                style={{ color: 'var(--text-secondary)' }}>
                📞 {t.client_phone}
              </a>
            )}

            {t.client_address && (
              <>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  📍 {t.client_address}
                </p>
                <GpsButton lat={t.client_lat} lng={t.client_lng} address={t.client_address} />
              </>
            )}

            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 text-xs px-2.5 py-1 rounded-lg transition"
            style={{
              background: 'var(--bg-base)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {expanded ? '▲ cerrar' : '▼ mapa'}
          </button>
        </div>

        {expanded && (
          <div className="mt-3">
            <MapView lat={t.client_lat} lng={t.client_lng} />
            {t.resolution_notes && (
              <p className="text-xs mt-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                <span className="font-medium">Resolución:</span> {t.resolution_notes}
              </p>
            )}
          </div>
        )}

        {next && onAdvance && (
          <button
            onClick={() => onAdvance(t)}
            disabled={loading}
            className="mt-3 w-full text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            style={{ background: next.value === 'resolved' ? '#059669' : next.value === 'on_the_way' ? '#D97706' : 'var(--accent)' }}
          >
            {loading ? 'Actualizando...' : `${next.icon} ${next.label}`}
          </button>
        )}
      </div>
    </div>
  );
}
