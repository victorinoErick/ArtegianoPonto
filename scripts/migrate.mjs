// Atualiza um banco que já existe, sem mexer em senhas. Pode rodar quantas vezes quiser.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`alter table settings add column if not exists hour_value numeric(10,2) not null default 18.75`;
await sql`alter table settings add column if not exists weekend_day_value numeric(10,2) not null default 185`;
console.log('Banco atualizado: pagamento por hora (R$ 18,75) e diária de fim de semana (R$ 185,00 / 8h) ativos.');
