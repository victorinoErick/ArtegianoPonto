# Artegiano · Controle de ponto

Next.js 16 + Postgres (Neon) + login por usuário e senha validado no servidor.

## Rodar na Vercel (passo a passo)

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project** e importe o repositório.
3. Ainda na Vercel, aba **Storage** do projeto: crie/conecte um banco **Neon (Postgres)**. Isso cria a variável `DATABASE_URL` sozinha.
4. Em **Settings → Environment Variables**, adicione `SESSION_SECRET` com um valor aleatório longo (`openssl rand -base64 32`).
5. Faça o deploy.
6. Crie as tabelas e o acesso da Renata (uma vez, no seu computador):
   ```bash
   npm i -g vercel && vercel link && vercel env pull .env.local
   echo 'ADMIN_USERNAME=renata.bac' >> .env.local
   echo 'ADMIN_NAME=Renata Bac' >> .env.local
   echo 'ADMIN_PASSWORD=uma-senha-forte-aqui' >> .env.local
   npm install && npm run db:setup
   ```
   Rodar de novo o `db:setup` com outra `ADMIN_PASSWORD` redefine a senha da Renata (serve como recuperação).
7. Abra o site, entre como Renata e crie os funcionários na aba **Equipe**.

## Atualizando um banco que já existe
Depois de baixar uma versão nova, rode uma vez no seu computador (usa o `.env.local`, não mexe em senhas):
```bash
npm run db:migrate
```
Hoje isso cria o valor da hora (R$ 18,75, editável em **Ajustes**).

## Como funciona o acesso
- A Renata cria o usuário (ex.: `erick.victorino`) e a senha de cada funcionário.
- A senha é guardada com hash (bcrypt); o login é validado em `/api/login`, que cria um cookie de sessão `httpOnly` (12 h).
- Toda rota confere a sessão e o papel (admin ou funcionário) no servidor, e consulta o banco a cada requisição: quem for removido perde o acesso na hora.
- 5 tentativas erradas em 15 minutos bloqueiam o usuário por um tempo.

## Banco (tabelas)
`users`, `shifts` (escala), `punches` (pontos), `payments` (dias pagos), `settings` (valor do dia, localização) e `login_attempts`.
