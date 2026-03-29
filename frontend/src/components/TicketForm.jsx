import { useState } from 'react';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre del cliente *">
          <input
            className={inputCls}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            value={form.client_name}
            onChange={e => set('client_name', e.target.value)}
            placeholder="Juan García"
            required
          />
        </Field>
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
      </div>

      <Field label={geocoding ? 'Dirección (buscando en mapa…)' : 'Dirección'}>
        <input
          className={inputCls}
          style={{ ...inputStyle, borderColor: geocoding ? 'var(--accent)' : 'var(--border)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={handleAddressBlur}
          value={form.client_address}
          onChange={e => set('client_address', e.target.value)}
          placeholder="Estrada 1310  (Eduardo Castex se agrega solo)"
        />
      </Field>

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
