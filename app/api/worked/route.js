import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';
import { DATE_RE, spDay, spMin } from '@/lib/time';
import { summarize, groupByUserDay } from '@/lib/work';

// Horários trabalhados (entrada→saída) e escalas de um período, para o gráfico semanal do painel.
export const GET = guard(async req => {
  const q = new URL(req.url).searchParams, from = q.get('from'), to = q.get('to');
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) return bad('Período inválido.');
  const pu = await sql`select user_id, type, ts, day::text as day from punches where day between ${from} and ${to} order by ts`;
  const sh = await sql`select user_id, day::text as day, to_char(start_time,'HH24:MI') st, to_char(end_time,'HH24:MI') en
    from shifts where day between ${from} and ${to} order by start_time`;
  const today = spDay(), now = spMin(new Date());
  const days = [];
  for (const [uid, byDay] of Object.entries(groupByUserDay(pu)))
    for (const [day, list] of Object.entries(byDay)) {
      const r = summarize(list);
      // entrada de hoje ainda sem saída: desenha até agora
      if (r.open != null && day === today) r.segs.push({ s: r.open, e: Math.max(now, r.open + 1), live: true });
      days.push({ userId: +uid, day, hours: r.hours, segs: r.segs, open: r.open != null && day !== today ? r.open : null });
    }
  return Response.json({ days, shifts: sh.map(x => ({ userId: x.user_id, day: x.day, st: x.st, en: x.en })) });
}, true);
