'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const brl = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmt = s => { const [y, m, d] = s.split('-'); return DIAS[new Date(+y, +m - 1, +d).getDay()] + ' ' + d + '/' + m; };
const week = off => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7);
  return [...Array(7)].map((_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return iso(x); });
};
async function call(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Algo deu errado.');
  return j;
}
const getPos = () => new Promise((ok, no) => navigator.geolocation
  ? navigator.geolocation.getCurrentPosition(ok, () => no(new Error('Não foi possível obter sua localização. Ative a localização e tente de novo.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  : no(new Error('Geolocalização indisponível neste aparelho.')));

export default function App() {
  const [user, setUser] = useState(undefined);
  const refresh = () => call('/api/me').then(j => setUser(j.user)).catch(() => setUser(null));
  useEffect(() => { refresh(); }, []);
  return (
    <main>
      <header className="brand"><div className="logo">Artegiano</div><div className="tag">Biscoitos artesanais</div></header>
      <h1>Controle de ponto</h1>
      {user === undefined ? <div className="card">Carregando…</div> : !user ? <Login onOk={refresh} /> : <Shell user={user} onOut={() => setUser(null)} />}
      <div className="foot">Criamos momentos especiais e memórias saborosas.</div>
    </main>
  );
}

function Login({ onOk }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await call('/api/login', 'POST', { username: u, password: p }); await onOk(); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <form className="card" onSubmit={go}>
      <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <label>Usuário<input value={u} onChange={e => setU(e.target.value)} autoCapitalize="none" autoComplete="username" placeholder="nome.sobrenome" /></label>
        <label>Senha<input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" /></label>
        <button className="btn" disabled={busy}>Entrar</button>
      </div>
      {err && <div className="msg bad">{err}</div>}
    </form>
  );
}

const TABS_A = [['dash', 'Painel'], ['escala', 'Escala'], ['pag', 'Pagamentos'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const TABS_E = [['ponto', 'Bater ponto'], ['semana', 'Minha semana']];

function Shell({ user, onOut }) {
  const admin = user.role === 'admin';
  const tabs = admin ? TABS_A : TABS_E;
  const [tab, setTab] = useState(tabs[0][0]);
  const V = { dash: Dash, escala: Escala, pag: Pagamentos, equipe: Equipe, ajustes: Ajustes, ponto: Ponto, semana: Semana }[tab];
  async function sair() { try { await call('/api/logout', 'POST'); } catch {} onOut(); }
  return (
    <>
      <p id="who" className="sub">{admin ? 'Administradora · ' : ''}{user.name} · <button className="x" style={{ color: 'var(--ac)' }} onClick={sair}>Sair</button></p>
      <nav>{tabs.map(t => <button key={t[0]} className={t[0] === tab ? 'on' : ''} onClick={() => setTab(t[0])}>{t[1]}</button>)}</nav>
      <V />
    </>
  );
}

/* ---------- funcionário ---------- */
function Ponto() {
  const [d, setD] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => call('/api/punch').then(setD).catch(e => setMsg(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function bater() {
    setBusy(true); setMsg('');
    try {
      let body = {};
      if (d.geoOn) { setMsg('Obtendo sua localização…'); const p = await getPos(); body = { lat: p.coords.latitude, lng: p.coords.longitude }; }
      const j = await call('/api/punch', 'POST', body);
      setMsg((j.type === 'in' ? 'Entrada' : 'Saída') + ' registrada às ' + j.time + '.'); await load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  if (!d) return <div className="card">{msg || 'Carregando…'}</div>;
  const last = d.punches[d.punches.length - 1], next = !last || last.type === 'out' ? 'in' : 'out';
  return (
    <>
      <div className="card">
        <div className="sub">Hoje, {fmt(iso(new Date()))}</div>
        <p>{d.shift ? <>Seu horário: <b>{d.shift.start} às {d.shift.end}</b></> : <span className="sub">Sem horário atribuído para hoje.</span>}</p>
        <button className="btn big" disabled={busy} onClick={bater}>{next === 'in' ? 'Registrar entrada' : 'Registrar saída'}</button>
        <div className="msg">{msg}</div>
      </div>
      <h2>Seus registros de hoje</h2>
      <div className="card">{d.punches.length ? d.punches.map((p, i) => <div className="sh" key={i}><span>{p.type === 'in' ? 'Entrada' : 'Saída'}</span><b>{p.time}</b></div>) : <span className="sub">Nenhum registro ainda.</span>}</div>
    </>
  );
}

function WeekNav({ wk, setWk }) {
  const w = week(wk);
  return <div className="row sp"><button className="btn ghost" onClick={() => setWk(wk - 1)}>‹</button><b>{fmt(w[0])} – {fmt(w[6])}</b><button className="btn ghost" onClick={() => setWk(wk + 1)}>›</button></div>;
}

function Semana() {
  const [wk, setWk] = useState(0); const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  const w = week(wk);
  useEffect(() => { setErr(''); call(`/api/shifts?from=${w[0]}&to=${w[6]}`).then(j => setRows(j.shifts)).catch(e => setErr(e.message)); }, [wk]);
  return (
    <>
      <WeekNav wk={wk} setWk={setWk} />
      {err && <div className="msg bad">{err}</div>}
      <div className="card" style={{ marginTop: 10 }}>
        {w.map(d => { const l = rows.filter(s => s.day === d); return (
          <div className={'sh' + (d === iso(new Date()) ? ' today' : '')} key={d}><span>{fmt(d)}</span><b>{l.length ? l.map(s => s.st + ' – ' + s.en).join(' · ') : <span className="sub">Folga</span>}</b></div>
        ); })}
      </div>
    </>
  );
}

/* ---------- admin ---------- */
function MonthNav({ m, setM }) {
  const [y, mo] = m.split('-').map(Number);
  const go = n => { const d = new Date(y, mo - 1 + n, 1); setM(d.getFullYear() + '-' + pad(d.getMonth() + 1)); };
  const label = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return <div className="row sp" style={{ marginBottom: 8 }}><button className="btn ghost" onClick={() => go(-1)}>‹</button><b>{label}</b><button className="btn ghost" onClick={() => go(1)}>›</button></div>;
}
const thisMonth = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
function useReport() {
  const [m, setM] = useState(thisMonth()); const [r, setR] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); return call('/api/report?month=' + m).then(setR).catch(e => setErr(e.message)); }, [m]);
  useEffect(() => { load(); }, [load]);
  return { m, setM, r, err, load };
}

// Cores das séries (paleta validada para daltonismo no fundo escuro). A cor segue o funcionário (ordem de cadastro).
const CORES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const fmtH = h => { const t = Math.round(h * 60); return Math.floor(t / 60) + 'h' + pad(t % 60); };
const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const toM = s => { const [h, m] = s.split(':'); return +h * 60 + +m; };

function useCores() {
  const [emps, setEmps] = useState([]);
  useEffect(() => { call('/api/employees').then(j => setEmps(j.employees)).catch(() => {}); }, []);
  return useMemo(() => {
    const cor = {}, nome = {};
    [...emps].sort((a, b) => a.id - b.id).forEach((e, i) => { cor[e.id] = CORES[i % CORES.length]; nome[e.id] = e.name; });
    return { cor: id => cor[id] || 'var(--mut)', nome: id => nome[id] || '—' };
  }, [emps]);
}

function Legenda({ ids, c }) {
  return <div className="lg">{ids.map(id => <span key={id}><i style={{ background: c.cor(id) }} />{c.nome(id)}</span>)}</div>;
}

function Dash() {
  const { m, setM, r, err } = useReport();
  const c = useCores();
  const t = r ? r.rows.reduce((a, x) => ({ due: a.due + x.due, paid: a.paid + x.paid, hours: a.hours + x.hours, planned: a.planned + x.planned,
    sd: a.sd + x.shiftsDue, ok: a.ok + x.shiftsDone, sh: a.sh + x.shifts }), { due: 0, paid: 0, hours: 0, planned: 0, sd: 0, ok: 0, sh: 0 }) : null;
  return (
    <>
      <MonthNav m={m} setM={setM} />
      {err && <div className="msg bad">{err}</div>}
      {r && (r.rows.length ? (
        <>
          <div className="kpis">
            <div className="kpi"><span className="kl">Folha a pagar</span><b className="kv">{brl(t.due)}</b><span className="sub">já pago no mês: {brl(t.paid)}</span></div>
            <div className="kpi"><span className="kl">Horas trabalhadas</span><b className="kv">{fmtH(t.hours)}</b><span className="sub">escaladas no mês: {fmtH(t.planned)}</span></div>
            <div className="kpi"><span className="kl">Escalas confirmadas</span><b className="kv">{t.ok} de {t.sd}</b>
              <span className="sub">{t.sd ? Math.round(t.ok / t.sd * 100) + '% compareceram' : 'nenhuma escala até hoje'}{t.sh > t.sd ? ` · ${t.sh - t.sd} ainda por vir` : ''}</span></div>
          </div>
          <SemanaChart c={c} />
          <MesChart m={m} rows={r.rows} c={c} />
          <h2>Por funcionário</h2>
          <div className="card wrap"><table className="tbl"><thead><tr><th>Funcionário</th><th>Dias</th><th>Atrasos</th><th>Faltas</th><th>Horas</th><th>A pagar</th></tr></thead><tbody>
            {r.rows.map(x => <tr key={x.id}><td><i className="dot" style={{ background: c.cor(x.id) }} />{x.name}{!x.active && <span className="sub"> (inativo)</span>}</td><td>{x.days}</td><td className={x.late ? 'warn' : ''}>{x.late}</td><td className={x.miss ? 'bad' : ''}>{x.miss}</td><td>{fmtH(x.hours)}</td><td>{brl(x.due)}</td></tr>)}
          </tbody></table></div>
        </>
      ) : <div className="card">Cadastre funcionários na aba Equipe para ver o painel.</div>)}
      <p className="sub">Escala confirmada = dia escalado (até hoje) em que o funcionário bateu a entrada. Atraso = primeira entrada mais de 5 min depois do início da escala. Falta = dia escalado já passado sem nenhum ponto.</p>
    </>
  );
}

/* Gráfico semanal: em que horário cada funcionário trabalhou, dia a dia, sobre a escala prevista */
function SemanaChart({ c }) {
  const [wk, setWk] = useState(0); const [d, setD] = useState(null); const [err, setErr] = useState(''); const [sel, setSel] = useState(null);
  const w = week(wk);
  useEffect(() => { setD(null); setErr(''); setSel(null); call(`/api/worked?from=${w[0]}&to=${w[6]}`).then(setD).catch(e => setErr(e.message)); }, [wk]);
  const linhas = useMemo(() => {
    if (!d) return {};
    const out = {};
    w.forEach(day => {
      const ids = [...new Set([...d.days.filter(x => x.day === day).map(x => x.userId), ...d.shifts.filter(x => x.day === day).map(x => x.userId)])];
      out[day] = ids.map(id => ({ id, day, key: day + ':' + id, w: d.days.find(x => x.day === day && x.userId === id), s: d.shifts.find(x => x.day === day && x.userId === id) }))
        .sort((a, b) => c.nome(a.id).localeCompare(c.nome(b.id)));
    });
    return out;
  }, [d, c]);
  const all = Object.values(linhas).flat();
  let lo = 8 * 60, hi = 18 * 60;
  all.forEach(x => {
    x.w?.segs.forEach(s => { lo = Math.min(lo, s.s); hi = Math.max(hi, s.e); });
    if (x.w?.open != null) { lo = Math.min(lo, x.w.open); hi = Math.max(hi, x.w.open + 60); }
    if (x.s) { lo = Math.min(lo, toM(x.s.st)); hi = Math.max(hi, toM(x.s.en)); }
  });
  lo = Math.floor(lo / 60); hi = Math.min(24, Math.ceil(hi / 60));
  const stepH = hi - lo > 10 ? 2 : 1;
  const ticks = []; for (let h = Math.ceil(lo / stepH) * stepH; h <= hi; h += stepH) ticks.push(h);
  const x = m => ((m - lo * 60) / ((hi - lo) * 60) * 100) + '%';
  const wd = (a, b) => ((b - a) / ((hi - lo) * 60) * 100) + '%';
  const ids = [...new Set(all.map(x => x.id))].sort((a, b) => a - b);
  const s = all.find(x => x.key === sel);
  return (
    <div className="card">
      <div className="row sp"><b>Horários trabalhados na semana</b></div>
      <WeekNav wk={wk} setWk={setWk} />
      {err && <div className="msg bad">{err}</div>}
      {!d ? <div className="sub" style={{ marginTop: 10 }}>{err ? '' : 'Carregando…'}</div> : !all.length ? <div className="sub" style={{ marginTop: 10 }}>Ninguém escalado nem com ponto nesta semana.</div> : <>
        <div className="lg"><span><i className="sw-solid" />trabalhado</span><span><i className="sw-plan" />escala prevista</span></div>
        <div className="tl">
          <div className="tl-row tl-axis"><span className="tl-lab" /><div className="tl-track">{ticks.map(h => <span key={h} className="tl-tick" style={{ left: x(h * 60) }}>{h}h</span>)}</div></div>
          {w.map(day => (
            <div className="tl-day" key={day}>
              <div className={'tl-dh' + (day === iso(new Date()) ? ' ok' : '')}>{fmt(day)}</div>
              {linhas[day].length ? linhas[day].map(r => (
                <button key={r.key} className={'tl-row' + (sel === r.key ? ' on' : '')} onClick={() => setSel(r.key)} onMouseEnter={() => setSel(r.key)}>
                  <span className="tl-lab">{c.nome(r.id).split(' ')[0]}</span>
                  <div className="tl-track">
                    {ticks.map(h => <i key={h} className="tl-grid" style={{ left: x(h * 60) }} />)}
                    {r.s && <i className="tl-plan" style={{ left: x(toM(r.s.st)), width: wd(toM(r.s.st), toM(r.s.en)), borderColor: c.cor(r.id) }} />}
                    {r.w?.segs.map((g, i) => <i key={i} className={'tl-seg' + (g.live ? ' live' : '')} style={{ left: x(g.s), width: wd(g.s, g.e), background: c.cor(r.id) }} />)}
                    {r.w?.open != null && <i className="tl-open" style={{ left: x(r.w.open), background: c.cor(r.id) }} />}
                  </div>
                </button>
              )) : <div className="tl-row"><span className="tl-lab sub">—</span><div className="tl-track" /></div>}
            </div>
          ))}
        </div>
        <div className="det">{s ? <>
          <b><i className="dot" style={{ background: c.cor(s.id) }} />{c.nome(s.id)}</b> · {fmt(s.day)}<br />
          {s.w?.segs.length ? 'Trabalhou ' + s.w.segs.map(g => hhmm(g.s) + '–' + (g.live ? 'agora' : hhmm(g.e))).join(', ') + ' (' + fmtH(s.w.hours) + ')' : 'Não bateu ponto'}
          {s.w?.open != null && <span className="warn"> · entrada às {hhmm(s.w.open)} sem saída</span>}
          {s.s ? ` · escala ${s.s.st}–${s.s.en}` : ' · sem escala'}
        </> : <span className="sub">Toque numa linha para ver os horários.</span>}</div>
        {ids.length > 1 && <Legenda ids={ids} c={c} />}
      </>}
    </div>
  );
}

/* Gráfico mensal: horas trabalhadas por dia, empilhadas por funcionário */
function MesChart({ m, rows, c }) {
  const [sel, setSel] = useState(null);
  const [y, mo] = m.split('-').map(Number), n = new Date(y, mo, 0).getDate();
  const cols = [...Array(n)].map((_, i) => {
    const d = `${m}-${pad(i + 1)}`;
    const parts = rows.map(x => { const it = x.list.find(l => l.day === d); return it && it.hours > 0 ? { id: x.id, h: it.hours } : null; }).filter(Boolean).sort((p, q) => p.id - q.id);
    return { d, i: i + 1, parts, tot: parts.reduce((a, p) => a + p.h, 0) };
  });
  const max = Math.max(0, ...cols.map(k => k.tot));
  const step = max <= 8 ? 2 : max <= 16 ? 4 : max <= 40 ? 8 : 16, top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
  const ids = [...new Set(cols.flatMap(k => k.parts.map(p => p.id)))].sort((a, b) => a - b);
  const s = cols.find(k => k.d === sel);
  return (
    <div className="card">
      <b>Horas trabalhadas por dia no mês</b>
      {!max ? <div className="sub" style={{ marginTop: 10 }}>Nenhuma hora registrada neste mês.</div> : <>
        {ids.length > 1 && <Legenda ids={ids} c={c} />}
        <div className="bc">
          <div className="bc-y">{ticks.map(v => <span key={v} style={{ bottom: (v / top * 100) + '%' }}>{v}h</span>)}</div>
          <div className="bc-plot">
            {ticks.map(v => <i key={v} className="bc-grid" style={{ bottom: (v / top * 100) + '%' }} />)}
            <div className="bc-cols">{cols.map(k => (
              <button key={k.d} className={'bc-col' + (sel === k.d ? ' on' : '')} onClick={() => setSel(k.d)} onMouseEnter={() => setSel(k.d)} aria-label={`Dia ${k.i}: ${fmtH(k.tot)}`}>
                <div className="bc-stk" style={{ height: (k.tot / top * 100) + '%' }}>{k.parts.map(p => <i key={p.id} style={{ flexGrow: p.h, background: c.cor(p.id) }} />)}</div>
              </button>
            ))}</div>
          </div>
        </div>
        <div className="bc-x">{cols.map(k => <span key={k.d}>{k.i === 1 || k.i % 5 === 0 ? k.i : ''}</span>)}</div>
        <div className="det">{s ? <>
          <b>{fmt(s.d)}</b> · total {fmtH(s.tot)}<br />
          {s.parts.length ? s.parts.map(p => <span key={p.id} className="det-i"><i className="dot" style={{ background: c.cor(p.id) }} />{c.nome(p.id)} {fmtH(p.h)}</span>) : <span className="sub">Ninguém trabalhou.</span>}
        </> : <span className="sub">Toque numa barra para ver o dia.</span>}</div>
      </>}
    </div>
  );
}

function Escala() {
  const [wk, setWk] = useState(0); const [rows, setRows] = useState([]); const [emps, setEmps] = useState([]); const [err, setErr] = useState('');
  const w = week(wk);
  const [f, setF] = useState({ userId: '', day: w[0], start: '10:00', end: '17:00' });
  const load = useCallback(() => call(`/api/shifts?from=${w[0]}&to=${w[6]}`).then(j => setRows(j.shifts)).catch(e => setErr(e.message)), [wk]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { call('/api/employees').then(j => { const a = j.employees.filter(e => e.active); setEmps(a); setF(x => ({ ...x, userId: x.userId || (a[0] && a[0].id) || '' })); }).catch(e => setErr(e.message)); }, []);
  async function add() { setErr(''); try { await call('/api/shifts', 'POST', f); await load(); } catch (e) { setErr(e.message); } }
  async function del(id) { setErr(''); try { await call('/api/shifts?id=' + id, 'DELETE'); await load(); } catch (e) { setErr(e.message); } }
  return (
    <>
      <div className="card"><b>Atribuir horário</b>
        <div className="row" style={{ marginTop: 8 }}>
          <label>Funcionário<select value={f.userId} onChange={e => setF({ ...f, userId: e.target.value })}>{emps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <label>Dia<input type="date" value={f.day} onChange={e => setF({ ...f, day: e.target.value })} /></label>
          <label>Início<input type="time" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label>
          <label>Fim<input type="time" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></label>
        </div>
        <button className="btn" style={{ marginTop: 10 }} onClick={add}>Salvar na escala</button>
        {err && <div className="msg bad">{err}</div>}
      </div>
      <WeekNav wk={wk} setWk={setWk} />
      <div className="card" style={{ marginTop: 10 }}>
        {w.map(d => { const l = rows.filter(s => s.day === d); return (
          <div key={d} style={{ padding: '6px 0', borderBottom: '1px dashed var(--bd)' }}><b className={d === iso(new Date()) ? 'ok' : ''}>{fmt(d)}</b>
            {l.length ? l.map(s => <div className="sh" key={s.id}><span>{s.name} · {s.st} – {s.en}</span><button className="x" onClick={() => del(s.id)}>Tirar</button></div>) : <div className="sub">Sem ninguém escalado</div>}
          </div>
        ); })}
      </div>
    </>
  );
}

function Pagamentos() {
  const { m, setM, r, err, load } = useReport();
  const [sel, setSel] = useState(null);
  const run = async fn => { try { await fn(); } catch (e) { alert(e.message); } await load(); };
  if (!r) return <div className="card">{err || 'Carregando…'}</div>;
  const x = sel != null && r.rows.find(y => y.id === sel);
  if (x) return <Calendario x={x} m={m} setM={setM} hv={r.hourValue} run={run} voltar={() => setSel(null)} />;
  const owe = r.rows.reduce((a, y) => a + y.due, 0), paid = r.rows.reduce((a, y) => a + y.paid, 0);
  return (
    <>
      <MonthNav m={m} setM={setM} />
      <div className="card row sp"><span>Valor da hora: <b>{brl(r.hourValue)}</b></span><span className="sub">Pago {brl(paid)} · <b className="warn">A pagar {brl(owe)}</b></span></div>
      {r.rows.map(y => { const pend = pendentes(y); return (
        <div className="card" key={y.id}>
          <button className="pg-who" onClick={() => setSel(y.id)}>
            <span><b>{y.name}</b><br /><span className="sub">{fmtH(y.hours)} em {y.days} dia(s) · pago {brl(y.paid)}</span></span>
            <span className="pg-due"><b className={y.due ? 'warn' : 'ok'}>{y.due ? 'a pagar ' + brl(y.due) : 'tudo pago'}</b><span className="ac">Ver calendário ›</span></span>
          </button>
          {pend.length > 0 && <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => run(() => call('/api/payments', 'POST', { userId: y.id, days: pend.map(d => d.day) }))}>
            Paguei {pend.length > 1 ? `os ${pend.length} dias pendentes` : 'o dia pendente'} ({brl(pend.reduce((a, d) => a + d.value, 0))})</button>}
        </div>
      ); })}
      {!r.rows.length && <div className="card">Sem funcionários.</div>}
      <p className="sub">Valor de cada dia = horas entre entrada e saída × valor da hora. Dia com “saída não batida” conta só as horas fechadas.</p>
    </>
  );
}
const pendentes = y => y.list.filter(d => !d.paid && !d.working && d.hours > 0);
const DIAS_CAL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/* Calendário do mês de um funcionário: entrada, saída, horas e valor de cada dia */
function Calendario({ x, m, setM, hv, run, voltar }) {
  const hoje = iso(new Date());
  const [dia, setDia] = useState(hoje.slice(0, 7) === m ? hoje : null);
  useEffect(() => { setDia(hoje.slice(0, 7) === m ? hoje : null); }, [m]);
  const [y, mo] = m.split('-').map(Number), n = new Date(y, mo, 0).getDate(), off = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
  const cells = [...Array(off).fill(null), ...[...Array(n)].map((_, i) => `${m}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const info = d => ({ w: x.list.find(l => l.day === d), s: x.sched.find(s => s.day === d) });
  const pend = pendentes(x);
  const pagar = days => run(() => call('/api/payments', 'POST', { userId: x.id, days }));
  const desfazer = d => run(() => call(`/api/payments?userId=${x.id}&day=${d}`, 'DELETE'));
  const sel = dia && info(dia);
  return (
    <>
      <div className="row sp" style={{ marginBottom: 8 }}><button className="btn ghost" onClick={voltar}>‹ Voltar</button><b style={{ fontSize: 18 }}>{x.name}</b><span style={{ width: 80 }} /></div>
      <MonthNav m={m} setM={setM} />
      <div className="kpis">
        <div className="kpi"><span className="kl">Horas no mês</span><b className="kv">{fmtH(x.hours)}</b><span className="sub">{x.days} dia(s) trabalhado(s)</span></div>
        <div className="kpi"><span className="kl">A pagar</span><b className={'kv' + (x.due ? ' warn' : '')}>{brl(x.due)}</b><span className="sub">{pend.length} dia(s) pendente(s)</span></div>
        <div className="kpi"><span className="kl">Já pago</span><b className="kv">{brl(x.paid)}</b><span className="sub">valor da hora: {brl(hv)}</span></div>
      </div>
      <div className="card">
        <div className="cal">
          {DIAS_CAL.map(d => <div key={d} className="cal-h">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="cal-c vazio" />;
            const { w, s } = info(d);
            const est = w ? (w.paid ? 'pago' : w.working ? 'agora' : w.hours > 0 ? 'pend' : 'aberto') : s ? (d < hoje ? 'falta' : 'escala') : '';
            return (
              <button key={d} className={'cal-c ' + est + (d === hoje ? ' hoje' : '') + (d === dia ? ' on' : '')} onClick={() => setDia(d)}>
                <span className="cal-n">{+d.slice(8)}</span>
                {w && <>
                  <span className="cal-t">{w.segs.map(g => hhmm(g.s) + '–' + hhmm(g.e)).join(' ')}{w.openAt != null && ' ' + hhmm(w.openAt) + '–?'}</span>
                  <span className="cal-v">{w.working ? 'agora' : fmtH(w.hours)}</span>
                  {w.hours > 0 && !w.working && <span className="cal-v cal-r">{brl(w.value)}</span>}
                </>}
                {!w && s && <span className="cal-t">{est === 'falta' ? 'falta' : s.st + '–' + s.en}</span>}
              </button>
            );
          })}
        </div>
        <div className="lg cal-lg"><span><i className="st-pago" />pago</span><span><i className="st-pend" />a pagar</span><span><i className="st-falta" />falta</span><span><i className="st-escala" />escala futura</span></div>
      </div>
      {sel && (
        <div className="card">
          <div className="row sp"><b>{fmt(dia)}</b>{sel.w?.paid && <span className="tag2 ok">Pago</span>}</div>
          {sel.w ? <>
            {sel.w.segs.map((g, i) => <div className="sh" key={i}><span>Entrada <b>{hhmm(g.s)}</b> · Saída <b>{hhmm(g.e)}</b></span><span>{fmtH((g.e - g.s) / 60)}</span></div>)}
            {sel.w.openAt != null && <div className="sh"><span>Entrada <b>{hhmm(sel.w.openAt)}</b> · {sel.w.working ? <span className="ok">ainda trabalhando</span> : <span className="warn">saída não batida</span>}</span><span>—</span></div>}
            <div className="sh"><span className="sub">Escala</span><span>{sel.s ? sel.s.st + ' – ' + sel.s.en : 'sem escala'}</span></div>
            {!sel.w.working && <div className="sh"><span>Total</span><span>{fmtH(sel.w.hours)} × {brl(hv)} = <b>{brl(sel.w.value)}</b></span></div>}
            <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
              {sel.w.paid ? <button className="x" onClick={() => desfazer(dia)}>Desfazer pagamento</button>
                : sel.w.working ? <span className="sub">Dá para pagar depois que ele bater a saída.</span>
                : sel.w.hours > 0 ? <button className="btn" onClick={() => pagar([dia])}>Paguei {brl(sel.w.value)}</button>
                : <span className="sub">Sem horas fechadas neste dia.</span>}
            </div>
          </> : <p className="sub" style={{ margin: '8px 0 0' }}>{sel.s ? (dia < hoje ? `Estava escalado das ${sel.s.st} às ${sel.s.en} e não bateu ponto.` : `Escalado das ${sel.s.st} às ${sel.s.en}.`) : 'Sem escala e sem ponto neste dia.'}</p>}
        </div>
      )}
      {pend.length > 1 && <button className="btn" style={{ width: '100%' }} onClick={() => pagar(pend.map(d => d.day))}>Paguei todos os {pend.length} dias pendentes ({brl(pend.reduce((a, d) => a + d.value, 0))})</button>}
    </>
  );
}

function Equipe() {
  const [emps, setEmps] = useState([]); const [f, setF] = useState({ name: '', username: '', password: '' }); const [msg, setMsg] = useState(''); const [ok, setOk] = useState(false);
  const load = useCallback(() => call('/api/employees').then(j => setEmps(j.employees)).catch(e => { setOk(false); setMsg(e.message); }), []);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault(); setMsg('');
    try { await call('/api/employees', 'POST', f); setOk(true); setMsg(`Acesso criado. Passe para ${f.name}: usuário ${f.username.trim().toLowerCase()} e a senha definida.`); setF({ name: '', username: '', password: '' }); load(); }
    catch (x) { setOk(false); setMsg(x.message); }
  }
  async function reset(e) { const p = prompt('Nova senha para ' + e.name + ' (mínimo 6 caracteres):'); if (p) { try { await call('/api/employees/' + e.id, 'PATCH', { password: p }); alert('Senha alterada.'); } catch (x) { alert(x.message); } } }
  async function toggle(e) { if (!e.active || confirm('Remover o acesso de ' + e.name + '? O histórico de pontos e pagamentos é mantido.')) { try { await call('/api/employees/' + e.id, 'PATCH', { active: !e.active }); } catch (x) { alert(x.message); } load(); } }
  return (
    <>
      <form className="card" onSubmit={add}><b>Novo funcionário</b>
        <div className="row" style={{ marginTop: 8 }}>
          <label>Nome<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Erick Victorino" /></label>
          <label>Usuário<input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} autoCapitalize="none" placeholder="erick.victorino" /></label>
          <label>Senha<input value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="mín. 6 caracteres" /></label>
        </div>
        <button className="btn" style={{ marginTop: 10 }}>Criar acesso</button>
        {msg && <div className={'msg ' + (ok ? 'ok' : 'bad')}>{msg}</div>}
      </form>
      <h2>Equipe ({emps.filter(e => e.active).length})</h2>
      <div className="card">{emps.length ? emps.map(e => <div className="sh" key={e.id}>
        <span>{e.name} <span className="sub">@{e.username}</span>{!e.active && <span className="tag2 bad" style={{ marginLeft: 6 }}>sem acesso</span>}</span>
        <span className="row"><button className="x" style={{ color: 'var(--ac)' }} onClick={() => reset(e)}>Trocar senha</button><button className="x" onClick={() => toggle(e)}>{e.active ? 'Remover' : 'Reativar'}</button></span>
      </div>) : <span className="sub">Ninguém cadastrado.</span>}</div>
    </>
  );
}

function Ajustes() {
  const [s, setS] = useState(null); const [msg, setMsg] = useState(''); const [ok, setOk] = useState(false);
  useEffect(() => { call('/api/settings').then(setS).catch(e => setMsg(e.message)); }, []);
  if (!s) return <div className="card">{msg || 'Carregando…'}</div>;
  const set = (k, v) => setS({ ...s, [k]: v });
  async function aqui() { try { const p = await getPos(); setS({ ...s, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }); setOk(true); setMsg('Posição obtida (precisão ~' + Math.round(p.coords.accuracy) + ' m). Toque em Salvar.'); } catch (e) { setOk(false); setMsg(e.message); } }
  async function save() { try { await call('/api/settings', 'PUT', s); setOk(true); setMsg('Salvo.'); } catch (e) { setOk(false); setMsg(e.message); } }
  return (
    <div className="card"><b>Ajustes</b>
      <div className="row" style={{ marginTop: 8 }}>
        <label>R$ por hora<input type="number" step="0.01" value={s.hourValue} onChange={e => set('hourValue', e.target.value)} /></label>
        <label>Exigir localização<select value={s.geoOn ? '1' : '0'} onChange={e => set('geoOn', e.target.value === '1')}><option value="0">Não (por enquanto)</option><option value="1">Sim</option></select></label>
        <label>Latitude<input value={s.lat ?? ''} onChange={e => set('lat', e.target.value)} inputMode="decimal" /></label>
        <label>Longitude<input value={s.lng ?? ''} onChange={e => set('lng', e.target.value)} inputMode="decimal" /></label>
        <label>Raio (m)<input type="number" value={s.radius} onChange={e => set('radius', e.target.value)} /></label>
      </div>
      <div className="row" style={{ marginTop: 10 }}><button className="btn ghost" onClick={aqui}>Usar minha posição atual</button><button className="btn" onClick={save}>Salvar</button></div>
      {msg && <div className={'msg ' + (ok ? 'ok' : 'bad')}>{msg}</div>}
      <p className="sub">Para ativar a localização: abra esta tela no celular, de dentro do local de trabalho, toque em “Usar minha posição atual”, marque “Sim” e salve.</p>
    </div>
  );
}
