import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';

export const GET = guard(async () => Response.json({
  employees: await sql`select id, name, username, active from users where role = 'employee' order by active desc, name`
}), true);

export const POST = guard(async req => {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim(), un = String(b.username || '').trim().toLowerCase(), pw = String(b.password || '');
  if (!name || !/^[a-z0-9._-]{3,30}$/.test(un) || pw.length < 6)
    return bad('Informe o nome, um usuário (3 a 30 caracteres: letras minúsculas, números, ponto, hífen) e uma senha de pelo menos 6 caracteres.');
  try {
    await sql`insert into users(username, name, password_hash) values(${un}, ${name}, ${await bcrypt.hash(pw, 10)})`;
  } catch (e) {
    if (e.code === '23505') return bad('Esse usuário já existe.', 409);
    throw e;
  }
  return Response.json({ ok: true });
}, true);
