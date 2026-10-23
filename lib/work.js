import { spMin } from '@/lib/time';

export const round2 = v => Math.round(v * 100) / 100;

// Recebe os pontos de UM funcionário em UM dia (ordenados por horário) e devolve
// as horas fechadas (entrada→saída), os trechos trabalhados em minutos do dia
// e, se ficou uma entrada sem saída, o minuto dessa entrada.
export function summarize(punches) {
  let hours = 0, open = null;
  const segs = [];
  for (const p of punches) {
    if (p.type === 'in' && open == null) open = p.ts;
    else if (p.type === 'out' && open != null) {
      hours += (new Date(p.ts) - new Date(open)) / 36e5;
      segs.push({ s: spMin(open), e: spMin(p.ts) });
      open = null;
    }
  }
  return { hours, segs, open: open != null ? spMin(open) : null };
}

export function groupByUserDay(punches) {
  const by = {};
  for (const p of punches) ((by[p.user_id] ||= {})[p.day] ||= []).push(p);
  return by;
}
