import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
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

  return (
    <div className="min-h-screen bg-gray-50">
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
          <span className="text-gray-400 text-sm">/ Secretaría</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Nuevo Reclamo
          </button>
          <span className="text-sm text-gray-600">{user.name}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition">Salir</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">
        {/* Ticket list */}
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            Reclamos ({tickets.length})
          </h2>
          <div className="space-y-2">
            {tickets.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm border border-gray-200">
                No hay reclamos. Creá el primero.
              </div>
            ) : (
              tickets.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="font-medium text-gray-800 text-sm">{t.client_name || '—'}</p>
                      {t.client_address && (
                        <p className="text-xs text-gray-500 mt-0.5">📍 {t.client_address}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">{t.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString('es-AR')}</p>
                      {t.assigned_name && (
                        <p className="text-xs text-blue-600 mt-1">🔧 {t.assigned_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form panel */}
        {showForm && (
          <div className="w-96 bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-fit sticky top-6">
            <h3 className="font-semibold text-gray-800 mb-4">Nuevo Reclamo</h3>
            <TicketForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
