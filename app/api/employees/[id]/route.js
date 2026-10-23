import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { guard, bad } from '@/lib/auth';

export const PATCH = guard(async (req, u, { params }) => {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10), b = await req.json().catch(() => ({}));
  if (!id) return bad('Funcionário inválido.');
  if (b.password !== undefined) {
    if (String(b.password).length < 6) return bad('A senha precisa ter pelo menos 6 caracteres.');
    await sql`update users set password_hash = ${await bcrypt.hash(String(b.password), 10)} where id = ${id} and role = 'employee'`;
  }
  if (typeof b.active === 'boolean') await sql`update users set active = ${b.active} where id = ${id} and role = 'employee'`;
  return Response.json({ ok: true });
}, true);