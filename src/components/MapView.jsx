import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Link } from 'react-router-dom';
import { INDORE, SEV_HEX } from '../lib/constants.js';
import { useEffect, useRef } from 'react';

maplibregl.setWorkerUrl(workerUrl);

const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';

function useDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function createMap(container, center, zoom, dark) {
  return new maplibregl.Map({
    container,
    style: dark ? DARK_STYLE : LIGHT_STYLE,
    center: [center[1], center[0]],
    zoom,
    attributionControl: true,
    pitchWithRotate: false,
    dragRotate: false,
  });
}

function addPin(map, coordinates, color = '#ef4444') {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 18px;
    height: 18px;
    border: 3px solid white;
    border-radius: 50%;
    background: ${color};
    box-shadow: 0 2px 12px #0005;
  `;
  return new maplibregl.Marker({ element: el })
    .setLngLat(coordinates)
    .addTo(map);
}

function useMapTheme(map) {
  const dark = useDarkMode();

  useEffect(() => {
    if (map) map.setStyle(dark ? DARK_STYLE : LIGHT_STYLE);
  }, [map, dark]);
}

export function MapPicker({ lat, lng, onPick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const callbackRef = useRef(onPick);

  const hasPosition = lat != null && lng != null;
  const center = hasPosition ? [lat, lng] : INDORE;

  callbackRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = createMap(
      containerRef.current,
      center,
      13,
      useDarkMode()
    );

    mapRef.current = map;

    map.on('click', (e) => {
      callbackRef.current?.(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useMapTheme(mapRef.current);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hasPosition) {
      const coordinates = [lng, lat];

      if (!markerRef.current) {
        markerRef.current = addPin(map, coordinates);
      } else {
        markerRef.current.setLngLat(coordinates);
      }

      map.flyTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), 15),
        duration: 700,
      });
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{
        height: 220,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    />
  );
}

export function IncidentMap({ incidents, height = 420 }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);

  const points = incidents.filter(
    (i) => i.lat != null && i.lng != null
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const map = createMap(
      containerRef.current,
      INDORE,
      12,
      useDarkMode()
    );

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useMapTheme(mapRef.current);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    points.forEach((incident) => {
      const color =
        incident.status === 'RESOLVED'
          ? '#22c55e'
          : SEV_HEX[incident.severity] || '#94a3b8';

      const el = document.createElement('div');
      el.style.cssText = `
        width: 22px;
        height: 22px;
        border: 3px solid white;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 2px 14px #0005;
        cursor: pointer;
      `;

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: true,
      }).setHTML(
        `<strong>${String(incident.type || 'Incident')}</strong>
         <br/>
         ${String(incident.address || '')}`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.lng, incident.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('dblclick', () => {
        window.location.hash = `/app/incident/${encodeURIComponent(incident.id)}`;
      });

      markersRef.current.push(marker);
    });

    if (points.length) {
      if (points.length === 1) {
        map.flyTo({
          center: [points[0].lng, points[0].lat],
          zoom: 15,
          duration: 700,
        });
      } else {
        const bounds = new maplibregl.LngLatBounds();

        points.forEach((p) => bounds.extend([p.lng, p.lat]));

        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
          duration: 700,
        });
      }
    }
  }, [incidents]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    />
  );
}

export function SinglePin({ lat, lng }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = createMap(
      containerRef.current,
      [lat, lng],
      15,
      useDarkMode()
    );

    mapRef.current = map;
    const marker = addPin(map, [lng, lat]);

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  useMapTheme(mapRef.current);

  return (
    <div
      ref={containerRef}
      style={{
        height: 180,
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    />
  );
}
