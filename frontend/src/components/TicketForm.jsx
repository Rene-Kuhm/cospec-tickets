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

export default function TicketForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleAddressBlur() {
    if (!form.client_address) return;
    const coords = await geocode(form.client_address);
    if (coords) set('lat', coords.lat) || setForm(f => ({ ...f, lat: coords.lat, lng: coords.lng }));
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente *</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.client_name}
            onChange={e => set('client_name', e.target.value)}
            placeholder="Juan García"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.client_phone}
            onChange={e => set('client_phone', e.target.value)}
            placeholder="2901 123456"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Dirección <span className="text-gray-400">(se busca en el mapa automáticamente)</span>
        </label>
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={form.client_address}
          onChange={e => set('client_address', e.target.value)}
          onBlur={handleAddressBlur}
          placeholder="Estrada 1310  (se agrega Eduardo Castex automáticamente)"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Ubicación en mapa <span className="text-gray-400">(o hacé click para marcar)</span>
        </label>
        <MapPicker
          lat={form.lat}
          lng={form.lng}
          onSelect={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del reclamo *</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Sin señal, fibra cortada, velocidad lenta..."
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          value={form.priority}
          onChange={e => set('priority', e.target.value)}
        >
          <option value="low">Baja</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">🔴 Urgente</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
        >
          {loading ? 'Guardando...' : 'Crear Reclamo'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
