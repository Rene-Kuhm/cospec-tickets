import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

function ClickHandler({ onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function MapPicker({ lat, lng, onSelect }) {
  const center = lat && lng ? [lat, lng] : [-35.9167, -64.2833]; // Eduardo Castex, La Pampa
  return (
    <div className="h-48 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={lat ? 15 : 10} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onSelect={onSelect} />
        {lat && lng && <Marker position={[lat, lng]} />}
      </MapContainer>
    </div>
  );
}

export function MapView({ lat, lng }) {
  if (!lat || !lng) return (
    <div className="h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
      Sin ubicación registrada
    </div>
  );
  return (
    <div className="h-40 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}
