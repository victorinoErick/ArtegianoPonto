import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
const sql = neon(process.env.DATABASE_URL);

await sql`create table if not exists users(
  id serial primary key,
  username text unique not null,
  name text not null,
  password_hash text not null,
  role text not null default 'employee' check (role in ('admin','employee')),
  active boolean not null default true,
  created_at timestamptz not null default now())`;
await sql`create table if not exists shifts(
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  day date not null, start_time time not null, end_time time not null)`;
await sql`create table if not exists punches(
  id serial primary key,
  user_id int not null references users(id),
  ts timestamptz not null default now(),
  day date not null,
  type text not null check (type in ('in','out')),
  lat double precision, lng double precision, dist int)`;
await sql`create index if not exists punches_day_idx on punches(day, user_id)`;
await sql`create table if not exists payments(
  user_id int not null references users(id),
  day date not null,
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now(),
  primary key(user_id, day))`;
await sql`create table if not exists settings(
  id int primary key default 1 check (id = 1),
  day_value numeric(10,2) not null default 150,
  geo_on boolean not null default false,
  lat double precision, lng double precision,
  radius int not null default 150)`;
await sql`alter table settings add column if not exists hour_value numeric(10,2) not null default 18.75`;
await sql`insert into settings(id) values(1) on conflict do nothing`;
await sql`create table if not exists login_attempts(
  id serial primary key, username text not null, ts timestamptz not null default now())`;

const u = (process.env.ADMIN_USERNAME || 'renata.bac').trim().toLowerCase();
const name = process.env.ADMIN_NAME || 'Renata Bac';
const pw = process.env.ADMIN_PASSWORD;
if (!pw || pw.length < 8) { console.error('Defina ADMIN_PASSWORD com pelo menos 8 caracteres.'); process.exit(1); }
const hash = await bcrypt.hash(pw, 10);
await sql`insert into users(username,name,password_hash,role) values(${u},${name},${hash},'admin')
  on conflict (username) do update set password_hash = excluded.password_hash, role = 'admin', active = true`;
console.log('Banco pronto. Admin:', u);
