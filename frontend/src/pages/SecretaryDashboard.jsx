import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import AppHeader from '../components/AppHeader';
import TicketForm from '../components/TicketForm';
import api from '../api';

export default function SecretaryDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);

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

  const active   = tickets.filter(t => t.status !== 'resolved');
  const resolved = tickets.filter(t => t.status === 'resolved');

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
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            <span className="text-base leading-none">+</span> Nuevo Reclamo
          </button>
        }
      />

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-6 gap-6">
        {/* Ticket list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              RECLAMOS ACTIVOS
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {active.length}
              </span>
            </h2>
          </div>

          <div className="space-y-2">
            {active.length === 0 && resolved.length === 0 ? (
              <EmptyState onNew={() => setShowForm(true)} />
            ) : (
              <>
                {active.map(t => <TicketRow key={t.id} ticket={t} />)}

                {resolved.length > 0 && (
                  <>
                    <p className="text-xs font-semibold pt-4 pb-1 uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}>
                      Resueltos
                    </p>
                    {resolved.map(t => <TicketRow key={t.id} ticket={t} muted />)}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Slide-in form */}
        {showForm && (
          <div className="w-[400px] shrink-0">
            <div className="rounded-xl p-5 sticky top-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Nuevo Reclamo
                </h3>
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

function TicketRow({ ticket: t, muted }) {
  return (
    <div className="rounded-xl px-4 py-3.5 transition"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        opacity: muted ? 0.7 : 1,
      }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.ticket_number}</span>
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
          </div>
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {t.client_name || '—'}
          </p>
          {t.client_address && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
              📍 {t.client_address}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(t.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
          {t.assigned_name && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent)' }}>
              🔧 {t.assigned_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="rounded-xl py-16 flex flex-col items-center text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
        style={{ background: 'var(--accent-light)' }}>
        <span className="text-2xl">📋</span>
      </div>
      <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Sin reclamos aún</p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Creá el primer reclamo para comenzar</p>
      <button
        onClick={onNew}
        className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
        style={{ background: 'var(--accent)' }}
      >
        + Nuevo Reclamo
      </button>
    </div>
  );
}
