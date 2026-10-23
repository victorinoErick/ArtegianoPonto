import { getSession } from '@/lib/auth';
export async function GET() {
  const u = await getSession();
  return Response.json({ user: u ? { id: u.id, name: u.name, role: u.role } : null });
}
