export const TZ = 'America/Sao_Paulo';
export const spDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
export const hm = ts => new Date(ts).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const spMin = ts => { const [h, m] = new Date(ts).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).split(':'); return +h * 60 + +m; };
export const toMin = s => { const a = s.split(':'); return +a[0] * 60 + +a[1]; };
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;
export const isWeekend = day => [0, 6].includes(new Date(day + 'T00:00:00').getDay());
export function dist(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = x => x * Math.PI / 180, a = r(lat2 - lat1), b = r(lng2 - lng1);
  const h = Math.sin(a / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(b / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
