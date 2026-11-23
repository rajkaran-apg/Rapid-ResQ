export const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const KEY = 'rq_token';
export const getToken = () => localStorage.getItem(KEY) || '';
export const setToken = t => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);
let onUnauthorized = () => {};
export const setUnauthorizedHandler = fn => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(API + '/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch { throw Object.assign(new Error('Cannot reach server. Check your internet connection.'), { status: 0 }); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && getToken() && !path.startsWith('/auth/')) onUnauthorized();
    throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  }
  return data;
}
export const qs = obj => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const s = p.toString(); return s ? '?' + s : '';
};
