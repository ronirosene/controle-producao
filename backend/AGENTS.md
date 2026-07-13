# AGENTS.md — Controle de Produção + Assistência Técnica

## Project Overview
Monorepo (backend/ + frontend/) — sistema integrado de produção e assistência técnica com NestJS + Prisma + SQLite.

## Stack
- **Backend:** NestJS 10, Prisma 5, SQLite, JWT (Passport + bcrypt + jsonwebtoken)
- **Frontend:** Next.js 14, Tailwind CSS 3, TypeScript
- **Banco:** SQLite (`controle.db` na raiz)

## Developer Commands
### Backend (backend/)
- `npm run dev` — `nest start --watch`
- `npm run build` — `nest build`
- `npx prisma generate` — Regenerate Prisma client after schema changes
- `npx prisma db push` — Push schema to SQLite (preserva dados existentes)
- `node dist/main.js` — Start production server (porta 3002)

### Frontend (frontend/)
- `npm run dev` — Next.js dev server (porta 3000)
- `npm run build` — Build for production

## Key Features
### Módulo Produção (Express → NestJS)
- **Serviços** (`/api/servicos`): CRUD, 6 endpoints
- **Produtos** (`/api/produtos`): mover/editar/estoque/dashboard/relatorio/posicao-atual/observacoes (14 endpoints)
- **Backups** (`/api/backups`): listar backups
- **Urgentes** (`/api/urgentes`): CRUD produtos urgentes
- **Dashboard** (`/api/dashboard`): estatísticas

### Módulo Assistência (NestJS novo)
- **Auth** (`/api/auth`): register, login (JWT), me
- **Customers** (`/api/customers`): CRUD clientes assistência
- **Products** (`/api/products`): CRUD produtos assistência (model: ServiceProduct)
- **ServiceOrders** (`/api/service-orders`): CRUD ordens de serviço com imagens
- **Upload** (`/api/upload`): upload de imagens

### Schema Unificado (Prisma)
- Tabelas produção (auto-increment): `User`, `Servico`, `Produto`, `Movimentacao`, `Backup`, `ProdutoUrgente`
- Tabelas assistência (UUID): `Customer`, `ServiceProduct`, `ServiceOrder`
- Todas as tabelas produção preservadas com `@@map` para nomes originais

## Frontend Pages
- `/` — Landing page ou Dashboard autenticado
- `/login` — Login
- `/clientes` — CRUD clientes (assistência)
- `/produtos` — CRUD produtos (assistência)
- `/ordens` — Ordens de serviço com fluxo financeiro
- `/servicos` — Serviços de produção
- `/estoque` — Gestão de estoque (mover/editar/ajuste)
- `/dashboard` — Dashboard produção

## Environment
- Porta backend: 3002
- Porta frontend: 3000
- Frontend proxy: `/api` → `localhost:3002/api`
- JWT_SECRET em `.env`

## Architecture
- Backend autônomo (NestJS, não Express)
- Frontend separado (Next.js)
- Auth via JWT com localStorage
- Sistema de produção legado (Express) preservado em `src_express/`
- Banco SQLite único compartilhado entre produção e assistência
