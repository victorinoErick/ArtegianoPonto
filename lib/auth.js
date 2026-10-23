import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);
const MAX = 60 * 60 * 12;

export async function createSession(user) {
  const t = await new SignJWT({ uid: user.id }).setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(MAX + 's').sign(key());
  const jar = await cookies();
  jar.set('session', t, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX });
}
export async function destroySession() {
  const jar = await cookies();
  jar.set('session', '', { path: '/', maxAge: 0 });
}

// Lê o cookie e confere no banco: usuário removido/desativado perde o acesso na hora.
export async function getSession() {
  const jar = await cookies();
  const c = jar.get('session')?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, key());
    const [u] = await sql`select id, name, role, active from users where id = ${payload.uid}`;
    return u && u.active ? u : null;
  } catch { return null; }
}

export const bad = (error, status = 400) => Response.json({ error }, { status });

export function guard(handler, admin = false) {
  return async (req, ctx) => {
    const u = await getSession();
    if (!u) return bad('Faça login para continuar.', 401);
    if (admin && u.role !== 'admin') return bad('Sem permissão.', 403);
    try { return await handler(req, u, ctx); }
    catch (e) { console.error(e); return bad('Erro interno.', 500); }
  };
}