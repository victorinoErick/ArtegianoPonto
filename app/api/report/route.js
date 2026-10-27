import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';
import { spDay, spMin, toMin, isWeekend } from '@/lib/time';
import { summarize, groupByUserDay, round2 } from '@/lib/work';

const TOL = 5; // minutos de tolerância para atraso

export const GET = guard(async req => {
  const m = new URL(req.url).searchParams.get('month') || spDay().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(m)) return bad('Mês inválido.');
  const [y, mo] = m.split('-').map(Number);
  const from = m + '-01', to = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`;
  const [s] = await sql`select hour_value::float as hv, weekend_day_value::float as wdv from settings where id = 1`;
  const users = await sql`select id, name, active from users where role = 'employee' order by active desc, name`;
  const pu = await sql`select user_id, type, ts, day::text as day from punches where day >= ${from} and day < ${to} order by ts`;
  const sh = await sql`select user_id, day::text as day, to_char(start_time,'HH24:MI') st, to_char(end_time,'HH24:MI') en from shifts where day >= ${from} and day < ${to}`;
  const pa = await sql`select user_id, day::text as day, amount::float as amount from payments where day >= ${from} and day < ${to}`;
  const today = spDay();
  const elapsed = today.slice(0, 7) === m ? +today.slice(8) : new Date(y, mo, 0).getDate();
  const byUser = groupByUserDay(pu);

  const rows = users.map(u => {
    const by = byUser[u.id] || {};
    const mine = sh.filter(x => x.user_id === u.id);
    // valor realmente pago em cada dia (guardado no momento do pagamento)
    const paid = new Map(pa.filter(x => x.user_id === u.id).map(x => [x.day, x.amount]));
    let hours = 0, late = 0;
    const list = Object.keys(by).sort().filter(d => by[d].some(p => p.type === 'in')).map(d => {
      const r = summarize(by[d]);
      hours += r.hours;
      const first = by[d].find(p => p.type === 'in'), planned = mine.find(x => x.day === d);
      if (planned && spMin(first.ts) > toMin(planned.st) + TOL) late++;
      const isPaid = paid.has(d);
      const rate = isWeekend(d) ? s.wdv / 8 : s.hv; // sáb/dom: diária de 8h (s.wdv) proporcional às horas
      return {
        day: d, hours: r.hours, open: r.open != null,
        working: r.open != null && d === today, // ainda trabalhando agora
        segs: r.segs, openAt: r.open, // horários (minutos do dia) para o calendário
        paid: isPaid, value: isPaid ? paid.get(d) : round2(r.hours * rate),
      };
    });
    let planned = 0, miss = 0, shiftsDue = 0, shiftsDone = 0;
    mine.forEach(x => {
      planned += (toMin(x.en) - toMin(x.st)) / 60;
      if (x.day <= today) {
        shiftsDue++;
        if (by[x.day]?.some(p => p.type === 'in')) shiftsDone++;
        else if (x.day < today) miss++;
      }
    });
    const due = round2(list.filter(x => !x.paid).reduce((a, x) => a + x.value, 0));
    const paidSum = round2(list.filter(x => x.paid).reduce((a, x) => a + x.value, 0));
    return { id: u.id, name: u.name, active: u.active, days: list.length, avg: list.length / Math.max(1, elapsed / 7),
      late, miss, hours, planned, shifts: mine.length, sched: mine.map(x => ({ day: x.day, st: x.st, en: x.en })), shiftsDue, shiftsDone, due, paid: paidSum, list };
  }).filter(r => r.active || r.list.length);

  return Response.json({ hourValue: s.hv, weekendDayValue: s.wdv, rows });
}, true);
