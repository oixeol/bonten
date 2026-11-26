# BONTEN — Plataforma Gamer All-in-One

> CONNECT. PLAY. EVOLVE.

Monorepo do BONTEN. Requisitos completos em [`BONTEN_prompt_completo.md`](./BONTEN_prompt_completo.md).

## Stack

- **Frontend:** Next.js + React + TypeScript (apps/web)
- **Backend principal:** NestJS + TypeScript (apps/api)
- **Infra:** PostgreSQL, Redis, LiveKit (voz), SeaweedFS (S3), Docker
- **Shared:** tipos/contratos (packages/shared)
- **Futuro:** Python/FastAPI, Rust/Tokio, Go (services/*, só com necessidade comprovada)

## Pré-requisitos

- Node.js >= 20
- pnpm 9 (`corepack enable`)
- Docker + Docker Compose v2

## Configuração

```bash
cp .env.example .env   # preencha os segredos (nunca versione .env)
pnpm install
```

## Subir o ambiente (dev)

```bash
docker compose up --build
```

Sobe: PostgreSQL, Redis, SeaweedFS, LiveKit, API (NestJS) e Web (Next.js). Portas:

| Serviço   | URL                          |
|-----------|------------------------------|
| Web       | http://localhost:3000        |
| API       | http://localhost:4000/api    |
| Postgres  | localhost:5432               |
| Redis     | localhost:6379               |
| SeaweedFS | http://localhost:8333 (S3) · :9333 (UI) |
| LiveKit   | ws://localhost:7880          |

Healthcheck: API `GET http://localhost:4000/api/health` · Web `GET http://localhost:3000/`

## Comandos

```bash
pnpm dev            # todos os apps em modo dev (turbo)
pnpm build          # build de tudo
pnpm lint           # lint
pnpm test           # testes
pnpm typecheck      # checagem de tipos
pnpm db:migrate     # migration Prisma (dev)
```

Ver logs: `docker compose logs -f api`
Parar: `docker compose down`
Parar e apagar volumes: `docker compose down -v`

## Segurança

- Segredos só no backend, via `.env`/Docker secrets. Nada com `NEXT_PUBLIC_` é segredo.
- Senhas com Argon2id. Sessões em cookie httpOnly guardadas no Redis. CSRF double-submit.
- LiveKit: cliente nunca recebe a chave secreta; a API emite tokens de curta duração.

## Status

- [x] Fase 0 — Planejamento
- [x] Fase 1 Parte A — Fundação (infra Docker + backend auth)
- [x] Fase 1 Parte 1 — Design system + logotipo (apps/web)
- [x] Fase 1 Parte 2 — Layout e navegação (topbar + dashboard Home)
- [x] Fase 1 Parte 3 — Fluxos de auth (login/registro ligados à API)
- [ ] Fases 2–9