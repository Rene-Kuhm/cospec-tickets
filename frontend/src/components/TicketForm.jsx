import { useState, useEffect, useRef } from 'react';
import { MapPicker } from './MapPicker';
import api from '../api';

const EMPTY = { client_name: '', client_phone: '', client_address: '', lat: null, lng: null, description: '', priority: 'normal' };
const BASE_LOCATION = 'Eduardo Castex, La Pampa, Argentina';

async function geocode(address) {
  try {
    const query = address.toLowerCase().includes('castex') ? address : `${address}, ${BASE_LOCATION}`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ar&limit=1`
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none transition';
const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' };

// ─── Client Search Autocomplete ──────────────────────────────────────────────────
function ClientSearch({ value, onSelect, onCreateNew }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/clients/search?q=${encodeURIComponent(query)}`);
        setResults(data);
        setShow(true);
        setSelectedIdx(-1);
      } catch {}
      setLoading(false);
    }, 300);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query]);

  function handleSelect(client) {
    onSelect({
      client_name: client.name,
      client_phone: client.phone || '',
      client_address: client.address || '',
      lat: client.lat,
      lng: client.lng,
    });
    setShow(false);
    setQuery('');
  }

  function handleKeyDown(e) {
    if (!show || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShow(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={inputCls}
        style={inputStyle}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; setShow(true); }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; setTimeout(() => setShow(false), 200); }}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        value={query}
        placeholder="Escribí para buscar cliente (nombre, DNI, dirección)…"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Buscando…
        </span>
      )}
      {show && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {results.map((c, i) => (
            <div
              key={c.id}
              onClick={() => handleSelect(c)}
              className="px-3 py-2 cursor-pointer transition"
              style={{
                background: i === selectedIdx ? 'var(--accent-light)' : 'transparent',
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
              <div className="flex gap-3 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {c.dni && <span>DNI: {c.dni}</span>}
                {c.phone && <span>📞 {c.phone}</span>}
                {c.address && <span>📍 {c.address}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {show && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg p-3 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No se encontró ningún cliente</p>
          <button
            onClick={() => { onCreateNew(query); setShow(false); setQuery(''); }}
            className="mt-2 text-xs font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            + Crear nuevo cliente
          </button>
        </div>
      )}
    </div>
  );
}

export default function TicketForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleAddressBlur() {
    if (!form.client_address) return;
    setGeocoding(true);
    const coords = await geocode(form.client_address);
    if (coords) setForm(f => ({ ...f, lat: coords.lat, lng: coords.lng }));
    setGeocoding(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tickets', form);
      onCreated(data);
      setForm(EMPTY);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el reclamo');
    } finally {
      setLoading(false);
    }
  }

  function handleClientSelect(clientData) {
    setForm(f => ({
      ...f,
      client_name: clientData.client_name,
      client_phone: clientData.client_phone,
      client_address: clientData.client_address,
      lat: clientData.lat,
      lng: clientData.lng,
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Cliente *">
        <ClientSearch
          value={form.client_name}
          onSelect={handleClientSelect}
          onCreateNew={(name) => set('client_name', name)}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Teléfono">
          <input
            className={inputCls}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            value={form.client_phone}
            onChange={e => set('client_phone', e.target.value)}
            placeholder="2335 123456"
          />
        </Field>
        <Field label="Dirección">
          <input
            className={inputCls}
            style={{ ...inputStyle, borderColor: geocoding ? 'var(--accent)' : 'var(--border)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={handleAddressBlur}
            value={form.client_address}
            onChange={e => set('client_address', e.target.value)}
            placeholder="Estrada 1310"
          />
        </Field>
      </div>

      <Field label="Ubicación en mapa">
        <MapPicker
          lat={form.lat}
          lng={form.lng}
          onSelect={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
        />
      </Field>

      <Field label="Descripción del reclamo *">
        <textarea
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Sin señal, fibra cortada, velocidad lenta..."
          required
        />
      </Field>

      <Field label="Prioridad">
        <select
          className={inputCls}
          style={{ ...inputStyle, appearance: 'auto' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          value={form.priority}
          onChange={e => set('priority', e.target.value)}
        >
          <option value="low">Baja</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">🔴 Urgente</option>
        </select>
      </Field>

      {error && (
        <div className="px-3.5 py-2.5 rounded-lg text-sm"
          style={{ background: '#FFF0F0', color: '#D92D20', border: '1px solid #FFC9C9' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          {loading ? 'Guardando...' : 'Crear Reclamo'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
