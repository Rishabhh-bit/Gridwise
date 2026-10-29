export const API = import.meta.env.VITE_API_BASE || '';
export async function api(path, body, method) {
  const response = await fetch(`${API}/api${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : `Request failed (${response.status}). Check the API connection and inputs.`);
  }
  return response.json();
}
export const fmt = (value, digits = 2) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const clock = stamp => stamp?.slice(11, 16) || '00:00';
export const dateLabel = stamp => new Date(stamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
export const LOAD_NAMES = { residential:'Residential', commercial:'Commercial', industrial:'Industry', ev:'EV charging', water:'Water pumps', hvac:'HVAC', hospital:'Hospital' };
