import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapPicker';
import api from '../api';

const NEXT_STATUS = {
  new:        { value: 'reviewing',  label: '👁 Tomar reclamo',  cls: 'bg-blue-600 hover:bg-blue-700' },
  reviewing:  { value: 'on_the_way', label: '🚗 Voy en camino',  cls: 'bg-yellow-500 hover:bg-yellow-600' },
  on_the_way: { value: 'resolved',   label: '✅ Marcar resuelto', cls: 'bg-green-600 hover:bg-green-700' },
};

function ResolveModal({ ticket, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-gray-900 mb-1">Resolver reclamo</h3>
        <p className="text-sm text-gray-500 mb-4">{ticket.ticket_number} — {ticket.client_name}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas de resolución</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Descripción de lo que se hizo..."
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            Confirmar resolución
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
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
    <div className="min-h-screen bg-gray-50">
      {resolving && (
        <ResolveModal
          ticket={resolving}
          onClose={() => setResolving(null)}
          onConfirm={(notes) => { advance(resolving, notes); setResolving(null); }}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">COSPEC</span>
            <span className="text-gray-400 text-xs ml-2">Técnico: {user.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            {active.length} activos
          </span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition">Salir</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {active.length === 0 && resolved.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-gray-200">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">Sin reclamos asignados</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Activos</h2>
                {active.map(t => (
                  <TicketCard key={t.id} ticket={t} loading={loading[t.id]} onAdvance={(ticket) => {
                    if (NEXT_STATUS[ticket.status]?.value === 'resolved') {
                      setResolving(ticket);
                    } else {
                      advance(ticket);
                    }
                  }} />
                ))}
              </>
            )}
            {resolved.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 pt-2">Resueltos hoy</h2>
                {resolved.map(t => <TicketCard key={t.id} ticket={t} loading={false} onAdvance={null} />)}
              </>
            )}
          </>
        )}
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
    // Google Maps
    return lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Eduardo Castex, La Pampa')}`;
  }

  return (
    <div className="flex gap-1 shrink-0">
      <a
        href={buildUrl('google')}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir en Google Maps"
        className="inline-flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full transition"
      >
        🗺 Maps
      </a>
      <a
        href={buildUrl('waze')}
        target="_blank"
        rel="noopener noreferrer"
        title="Navegar con Waze"
        className="inline-flex items-center gap-1 text-xs bg-sky-50 hover:bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full transition"
      >
        🚗 Waze
      </a>
    </div>
  );
}

function TicketCard({ ticket: t, loading, onAdvance }) {
  const [expanded, setExpanded] = useState(false);
  const next = NEXT_STATUS[t.status];

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${t.priority === 'urgent' ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
            </div>
            <p className="font-semibold text-gray-800">{t.client_name || '—'}</p>
            {t.client_phone && <p className="text-xs text-gray-500">📞 {t.client_phone}</p>}
            {t.client_address && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">📍 {t.client_address}</p>
                <GpsButton lat={t.client_lat} lng={t.client_lng} address={t.client_address} />
              </div>
            )}
            <p className="text-sm text-gray-600 mt-1">{t.description}</p>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
          >
            {expanded ? '▲ menos' : '▼ mapa'}
          </button>
        </div>

        {expanded && (
          <div className="mt-3">
            <MapView lat={t.client_lat} lng={t.client_lng} />
            {t.resolution_notes && (
              <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                Resolución: {t.resolution_notes}
              </p>
            )}
          </div>
        )}

        {next && onAdvance && (
          <button
            onClick={() => onAdvance(t)}
            disabled={loading}
            className={`mt-3 w-full text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50 ${next.cls}`}
          >
            {loading ? 'Actualizando...' : next.label}
          </button>
        )}
      </div>
    </div>
  );
}
