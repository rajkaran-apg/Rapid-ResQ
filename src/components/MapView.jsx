import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { INDORE, SEV_HEX } from '../lib/constants.js';

const Tiles = () => <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />;

function Fit({ points }) {
  const map = useMap();
  useEffect(() => { if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 }); }, [points.length]); // eslint-disable-line
  return null;
}
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, Math.max(map.getZoom(), 15)); }, [center?.[0], center?.[1]]); // eslint-disable-line
  return null;
}
function Picker({ onPick }) { useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) }); return null; }

/** Tap-to-place location picker used by the report form. */
export function MapPicker({ lat, lng, onPick }) {
  const center = lat != null ? [lat, lng] : INDORE;
  return (
    <MapContainer center={center} zoom={13} style={{ height: 220 }} scrollWheelZoom={false}>
      <Tiles /><Picker onPick={onPick} /><Recenter center={lat != null ? center : null} />
      {lat != null && <CircleMarker center={center} radius={10} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1 }} />}
    </MapContainer>
  );
}

/** Incident markers coloured by severity (only incidents that have GPS coordinates). */
export function IncidentMap({ incidents, height = 420 }) {
  const pts = incidents.filter(i => i.lat != null);
  return (
    <MapContainer center={INDORE} zoom={12} style={{ height }} scrollWheelZoom>
      <Tiles /><Fit points={pts.map(i => [i.lat, i.lng])} />
      {pts.map(i => (
        <CircleMarker key={i.id} center={[i.lat, i.lng]} radius={i.status === 'RESOLVED' ? 7 : 11}
          pathOptions={{ color: '#fff', weight: 2, fillColor: i.status === 'RESOLVED' ? '#22c55e' : SEV_HEX[i.severity] || '#94a3b8', fillOpacity: 0.95 }}>
          <Popup><b>{i.type}</b><br />{i.address}<br /><Link to={`/app/incident/${i.id}`}>Open {i.id}</Link></Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export function SinglePin({ lat, lng }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ height: 180 }} scrollWheelZoom={false} dragging={false}>
      <Tiles /><CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1 }} />
    </MapContainer>
  );
}
