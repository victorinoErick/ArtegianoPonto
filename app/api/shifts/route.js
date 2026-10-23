import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';
import { DATE_RE, TIME_RE, toMin } from '@/lib/time';

export const GET = guard(async (req, u) => {
  const q = new URL(req.url).searchParams, from = q.get('from'), to = q.get('to');
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) return bad('Período inválido.');
  const rows = u.role === 'admin'
    ? await sql`select s.id, s.user_id, u.name, s.day::text as day, to_char(s.start_time,'HH24:MI') st, to_char(s.end_time,'HH24:MI') en
        from shifts s join users u on u.id = s.user_id where s.day between ${from} and ${to} order by s.day, s.start_time`
    : await sql`select s.id, s.user_id, u.name, s.day::text as day, to_char(s.start_time,'HH24:MI') st, to_char(s.end_time,'HH24:MI') en
        from shifts s join users u on u.id = s.user_id where s.user_id = ${u.id} and s.day between ${from} and ${to} order by s.day, s.start_time`;
  return Response.json({ shifts: rows });
});

export const POST = guard(async req => {
  const b = await req.json().catch(() => ({})), uid = parseInt(b.userId, 10);
  if (!uid || !DATE_RE.test(b.day || '') || !TIME_RE.test(b.start || '') || !TIME_RE.test(b.end || '')) return bad('Preencha todos os campos.');
  if (toMin(b.end) <= toMin(b.start)) return bad('O fim precisa ser depois do início.');
  await sql`insert into shifts(user_id, day, start_time, end_time) values(${uid}, ${b.day}, ${b.start}, ${b.end})`;
  return Response.json({ ok: true });
}, true);

export const DELETE = guard(async req => {
  const id = parseInt(new URL(req.url).searchParams.get('id'), 10);
  if (!id) return bad('Escala inválida.');
  await sql`delete from shifts where id = ${id}`;
  return Response.json({ ok: true });
}, true);
