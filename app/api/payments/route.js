import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';
import { DATE_RE, spDay } from '@/lib/time';
import { summarize, round2, rateFor } from '@/lib/work';

// Marca dias como pagos. O valor é calculado aqui no servidor: horas trabalhadas no dia × valor da hora
// (ou, em sábado/domingo, × a diária de fim de semana dividida por 8h; para o Erick, sempre a diária fixa dele).
export const POST = guard(async req => {
  const b = await req.json().catch(() => ({})), uid = parseInt(b.userId, 10);
  const days = Array.isArray(b.days) ? b.days.filter(d => DATE_RE.test(d)) : [];
  if (!uid || !days.length) return bad('Dados inválidos.');
  const [user] = await sql`select username from users where id = ${uid}`;
  if (!user) return bad('Funcionário inválido.');
  const [s] = await sql`select hour_value::float as hv, weekend_day_value::float as wdv from settings where id = 1`;
  const pu = await sql`select type, ts, day::text as day from punches where user_id = ${uid} and day = any(${days}::date[]) order by ts`;
  const today = spDay();
  let n = 0;
  for (const d of days) {
    const r = summarize(pu.filter(p => p.day === d));
    if (r.hours <= 0) continue;               // nada trabalhado nesse dia
    if (r.open != null && d === today) continue; // ainda trabalhando: paga depois da saída
    const rate = rateFor(user.username, d, s.hv, s.wdv);
    await sql`insert into payments(user_id, day, amount) values(${uid}, ${d}, ${round2(r.hours * rate)}) on conflict do nothing`;
    n++;
  }
  if (!n) return bad('Nenhum dia com horas fechadas para pagar.');
  return Response.json({ ok: true, paid: n });
}, true);

export const DELETE = guard(async req => {
  const q = new URL(req.url).searchParams, uid = parseInt(q.get('userId'), 10), day = q.get('day');
  if (!uid || !DATE_RE.test(day || '')) return bad('Dados inválidos.');
  await sql`delete from payments where user_id = ${uid} and day = ${day}`;
  return Response.json({ ok: true });
}, true);
