import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';
import { spDay, hm, dist } from '@/lib/time';

export const GET = guard(async (req, u) => {
  if (u.role !== 'employee') return bad('Apenas funcionários batem ponto.', 403);
  const day = spDay();
  const pu = await sql`select type, ts from punches where user_id = ${u.id} and day = ${day} order by ts`;
  const [sh] = await sql`select to_char(start_time,'HH24:MI') st, to_char(end_time,'HH24:MI') en from shifts where user_id = ${u.id} and day = ${day} limit 1`;
  const [s] = await sql`select geo_on from settings where id = 1`;
  return Response.json({ punches: pu.map(p => ({ type: p.type, time: hm(p.ts) })), shift: sh ? { start: sh.st, end: sh.en } : null, geoOn: s.geo_on });
});

export const POST = guard(async (req, u) => {
  if (u.role !== 'employee') return bad('Apenas funcionários batem ponto.', 403);
  const b = await req.json().catch(() => ({}));
  const [s] = await sql`select * from settings where id = 1`;
  let lat = null, lng = null, d = null;
  if (s.geo_on) {
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number') return bad('Localização necessária para bater o ponto.');
    d = Math.round(dist(b.lat, b.lng, s.lat, s.lng)); lat = b.lat; lng = b.lng;
    if (d > s.radius) return bad(`Você está a cerca de ${d} m do local (limite: ${s.radius} m).`, 403);
  }
  const day = spDay();
  const [last] = await sql`select type from punches where user_id = ${u.id} and day = ${day} order by ts desc limit 1`;
  const type = last?.type === 'in' ? 'out' : 'in';
  const [r] = await sql`insert into punches(user_id, day, type, lat, lng, dist) values(${u.id}, ${day}, ${type}, ${lat}, ${lng}, ${d}) returning ts`;
  return Response.json({ type, time: hm(r.ts) });
});
