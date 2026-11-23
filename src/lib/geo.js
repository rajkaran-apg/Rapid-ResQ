import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export async function getPosition() {
  if (Capacitor.isNativePlatform()) await Geolocation.requestPermissions();
  const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
  return { lat: p.coords.latitude, lng: p.coords.longitude };
}
export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    return (await r.json()).display_name || '';
  } catch { return ''; }
}
