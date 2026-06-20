# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BarberSaaS: multi-tenant SaaS for barbershop management — admin panel + public booking page + client portal. **.NET 9 backend** (own, no Supabase — despite what older prompts/docs may say) + **React 18 frontend**.

## Commands

### Backend (`src/`)
```powershell
cd C:\Users\Gus\BarberSaaS
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project src\BarberSaaS.API\BarberSaaS.API.csproj
# http://localhost:5000 — creates/seeds barbersaas_dev.db (SQLite) via EnsureCreatedAsync (Development only)
```
- Build: `dotnet build BarberSaaS.sln`
- No backend test project currently exists in the solution.
- `dotnet ef` tooling has historically been unavailable in this environment — migrations work is partial (see DB-01 in AUDITORIA.md).

### Frontend (`frontend/barbersaas-web/`)
```powershell
cd C:\Users\Gus\BarberSaaS\frontend\barbersaas-web
npm run dev      # http://localhost:5173, proxies /api -> http://localhost:5000
npm run build    # tsc -b && vite build — THIS catches TS errors; `npm run dev` (Vite) does not
npm run lint
```

### Demo login
`demo@barbersaas.com` / `demo123456` (Role Owner, tenant "Barbearia Demo").

## Architecture

### Backend — Clean Architecture, 4 projects in `src/`
- **`BarberSaaS.Domain`** — entities, enums, exceptions. All entities derive from `BaseEntity` (`Id`, `TenantId`, `IsDeleted`, `UpdatedAt`).
- **`BarberSaaS.Application`** — CQRS via **MediatR** (`Commands`/`Queries` per feature folder: Appointments, Auth, Barbers, ClientAuth, ClientPortal, Clients, Dashboard, Financial, Goals, Notifications, Products, Services, Settings, Tenants), **FluentValidation** (`ValidationBehavior` pipeline), repository interfaces.
- **`BarberSaaS.Infrastructure`** — EF Core (`AppDbContext`, `Configurations/`, `Repositories/`), JWT, Hangfire, BCrypt, Redis (optional), Google Calendar/Email (stubs). DB: SQLite in dev, SQL Server in prod. Hangfire: InMemory in dev, SqlServer in prod.
- **`BarberSaaS.API`** — 13 controllers under `Controllers/v1/` (`/api/v1/...`), `Middlewares/` (Exception, Tenant), Serilog, rate limiting, Swagger.

Recent refactor direction: controllers are being moved from ad-hoc logic to **CQRS + dedicated repositories** (see commits for ClientsController, ClientController, ProductsController). When touching a controller that hasn't been migrated yet, prefer following this same pattern — thin controller, MediatR command/query, typed DTO, dedicated repository — rather than adding logic inline.

### Multi-tenancy — critical invariants
- Tenant comes **only from the JWT claim `tenant_id`**, never from request headers (`X-Tenant-Id` was a spoofing vector — already removed).
- EF Core global query filters enforce tenant isolation, applied via `ICurrentTenant`, read as an **instance property** of `AppDbContext` (`CurrentTenantId`) — not a static closure, or the filter freezes the tenant value in the cached model across requests.
- The `Tenant` entity itself is the root and has empty `TenantId` — it must NOT get the tenant predicate (only soft-delete), or queries for the tenant's own row exclude themselves. Tenant lookups must go by Id/Slug only (no list endpoint, to avoid enumeration).
- Repository reads must use `FirstOrDefaultAsync`, not `FindAsync` — `FindAsync` bypasses EF global query filters (tenant + soft-delete), reopening IDOR.
- JWT setup needs `MapInboundClaims = false` with explicit `RoleClaimType`/`NameClaimType` set to `"role"`/`"name"` — the default remapping breaks `RequireClaim("role", …)` and claim lookups by `"sub"`.

### Frontend — `frontend/barbersaas-web/src/`
- **React 18.3.1** (pinned below 19 for Zustand 5 compat) + Vite 8 + TypeScript 6 + Tailwind 3.
- State: **Zustand 5** (`store/authStore`, persisted to `localStorage["barbersaas-auth"]`; `store/themeStore` controls light/dark via `data-theme` on `<html>`, persisted to `localStorage["barbersaas-theme"]`).
- Server state: **@tanstack/react-query 5**. HTTP via **axios** (`lib/api.ts`), base `/api/v1`, injects Bearer token, auto-refreshes on 401.
- Routing: react-router-dom 7. Forms: react-hook-form + zod (zod still underused — not every form is validated with it yet).
- Structure: `pages/` (admin, auth, client, public) for routes, `features/<domain>/` for API hooks + types per domain, `components/` (admin, booking, layout, ui) for shared UI, `store/` for Zustand stores.

### Design system
All styling goes through CSS-variable tokens defined in `src/index.css` (`:root` = dark, `:root[data-theme="light"]` = light overrides), expressed in RGB channels so Tailwind opacity utilities work. `tailwind.config.js` maps semantic names (`bg-app`, `bg-surface`, `surfaceHover`, `border`, `content`, `muted`, `subtle`, `accent`, `accentFg`, `success/warning/danger/info`) onto these tokens. **Never hardcode colors (no `gray-*`/`yellow-*` literals) in screens — use the semantic tokens**, since per-tenant branding overrides `--accent` at runtime via `applyTenantTheme()`. Full reference: `DESIGN_SYSTEM.md`. Live reference at route `/style-guide`.

## Other references
- `AI_HANDOFF.md` — running log of phases completed, gotchas discovered, files touched per phase. Check it for the current state of in-flight refactors before starting new work.
- `AUDITORIA.md` — full audit findings (file:line + repro steps) backing the phase plan.
- `PLANO_REFATORACAO.md` — refactor plan/roadmap.
