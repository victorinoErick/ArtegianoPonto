import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';

export const GET = guard(async (req, u) => {
  const [s] = await sql`select hour_value::float as "hourValue", geo_on as "geoOn", lat, lng, radius from settings where id = 1`;
  return Response.json(u.role === 'admin' ? s : { geoOn: s.geoOn });
});

export const PUT = guard(async req => {
  const b = await req.json().catch(() => ({}));
  const hv = Number(String(b.hourValue).replace(',', '.')), radius = parseInt(b.radius, 10) || 150, geoOn = !!b.geoOn;
  const lat = b.lat === null || b.lat === '' ? null : Number(b.lat), lng = b.lng === null || b.lng === '' ? null : Number(b.lng);
  if (!(hv > 0)) return bad('Valor da hora inválido.');
  if (geoOn && (lat === null || lng === null || isNaN(lat) || isNaN(lng))) return bad('Para exigir localização, informe latitude e longitude.');
  await sql`update settings set hour_value = ${hv}, geo_on = ${geoOn}, lat = ${lat}, lng = ${lng}, radius = ${radius} where id = 1`;
  return Response.json({ ok: true });
}, true);
