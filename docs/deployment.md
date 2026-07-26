# Deployment

Coming soon.

## Local development

### Backend + Postgres (Docker)

```bash
cd be
cp .env.example .env
docker compose up --build
```

- API: `http://localhost:4000`
- Postgres host port: `5433` (container port `5432`)

### Backend (bare metal)

```bash
cd be
cp .env.example .env
npm install
npm run start:dev
```

Ensure `DB_*` variables in `.env` match your Postgres instance.

### Web frontend

```bash
cd webFe
cp .env.example .env
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` to your API origin (default `http://localhost:4000`).

## Production notes

- Set a strong `JWT_SECRET`
- Prefer `DATABASE_URL` (or non-pooling Postgres URL) over ad-hoc host overrides
- Do not commit `.env` files
- Build the API image with `be/Dockerfile` (multi-stage: `builder` → `production`)
- Serve the Next.js app with `npm run build && npm run start` (or your host of choice)

More production hardening guidance (TLS, reverse proxy, backups) will be documented here.
