import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { createSession, bad } from '@/lib/auth';

const DUMMY = bcrypt.hashSync('dummy-password', 10);

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const un = String(b.username || '').trim().toLowerCase();
  const pw = String(b.password || '');
  if (!un || !pw) return bad('Informe usuário e senha.');
  const [{ n }] = await sql`select count(*)::int n from login_attempts where username = ${un} and ts > now() - interval '15 minutes'`;
  if (n >= 5) return bad('Muitas tentativas. Tente novamente em alguns minutos.', 429);
  const [u] = await sql`select id, password_hash, active from users where username = ${un}`;
  const ok = await bcrypt.compare(pw, u ? u.password_hash : DUMMY);
  if (!u || !u.active || !ok) {
    await sql`insert into login_attempts(username) values(${un})`;
    return bad('Usuário ou senha inválidos.', 401);
  }
  await sql`delete from login_attempts where username = ${un}`;
  await createSession(u);
  return Response.json({ ok: true });
}
