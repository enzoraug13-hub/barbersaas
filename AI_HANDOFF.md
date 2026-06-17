# AI_HANDOFF — BarberSaaS

> Resumo técnico do estado do projeto para retomada por outro agente/dev.
> Última atualização: 2026-06-16. Processo em fases (ver `AUDITORIA.md`).

---

## 1. O que é o projeto

SaaS de gestão para barbearias: painel administrativo + página pública de agendamento, multi-tenant.

**⚠️ Importante:** apesar de prompts antigos mencionarem "Supabase", **este projeto NÃO usa Supabase**. É um **backend .NET próprio** + frontend React. Qualquer menção a "RLS/edge functions" deve ser lida como **filtros globais multi-tenant do EF Core / authorization policies / controllers**.

---

## 2. Stack real

### Backend — `src/` (.NET 9, Clean Architecture, 4 camadas)
- `BarberSaaS.Domain` — entidades + enums + exceptions (raiz: `BaseEntity` com `Id`, `TenantId`, `IsDeleted`, `UpdatedAt`).
- `BarberSaaS.Application` — CQRS via **MediatR**, **FluentValidation** (ValidationBehavior), DTOs, interfaces de repositório.
- `BarberSaaS.Infrastructure` — **EF Core** (`AppDbContext`, configurations, repositórios), **JWT**, **Hangfire**, BCrypt, Redis (opcional), Google Calendar/Email (stubs).
- `BarberSaaS.API` — 11 controllers (`/api/v1/...`), middlewares (Exception, Tenant), Serilog, rate limiting, Swagger.
- Banco: **SQLite** em dev (`Data Source=...`, auto-detectado), **SQL Server** em prod. Hangfire: **InMemory** em dev, SqlServer em prod.
- Multi-tenant: filtros globais do EF + `ICurrentTenant` (vindo do claim `tenant_id` do JWT).

### Frontend — `frontend/barbersaas-web/`
- **React 18.3.1** (downgrade do 19 por compat. com Zustand 5) + **Vite 8** + **TypeScript 6** + **TailwindCSS 3**.
- Estado: **Zustand 5** (`authStore`, persist em `localStorage["barbersaas-auth"]`).
- Server-state: **@tanstack/react-query 5**. HTTP: **axios** (`lib/api.ts`, base `/api/v1`, injeta Bearer, refresh automático no 401).
- Rotas: react-router-dom 7. Forms: react-hook-form + zod (zod ainda **subutilizado**). UI: lucide-react, react-hot-toast.

---

## 3. Como rodar

**Backend** (terminal próprio, persistente):
```powershell
cd C:\Users\Gus\BarberSaaS
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project src\BarberSaaS.API\BarberSaaS.API.csproj
# Sobe em http://localhost:5000 (launchSettings.json define Development + porta)
# Cria e popula barbersaas_dev.db (SQLite) via EnsureCreatedAsync (só em Development)
```

**Frontend** (segundo terminal):
```powershell
cd C:\Users\Gus\BarberSaaS\frontend\barbersaas-web
npm run dev    # http://localhost:5173 ; proxy /api -> http://localhost:5000
```

**Login demo:** `demo@barbersaas.com` / `demo123456` (Role Owner, tenant "Barbearia Demo").

> Notas:
> - **Não é um repositório git** (sem `git init`) → não há commits.
> - Rodar em background pelo agente reporta "exit code 255" ao ser encerrado — é só o cleanup, não falha funcional.
> - `npm run dev` (Vite) **não faz type-check**; use `npm run build` (`tsc -b && vite build`) para pegar erros de TS.
> - Warnings de build pré-existentes (não bloqueiam): `NU1903` (AutoMapper 13.0.1), `NU1603` (Google.Apis.Calendar). O `CS8604` do SettingsController foi corrigido.

---

## 4. Processo em fases (estado)

Auditoria completa em **`AUDITORIA.md`** (25 achados, com arquivo:linha e passo de reprodução).

| Fase | Tema | Status |
|---|---|---|
| 0 | Reconhecimento | ✅ Concluída |
| 1 | Auditoria (`AUDITORIA.md`) | ✅ Concluída |
| 2 | **Segurança** | ✅ Concluída e validada em runtime |
| 3 | Funcionalidades quebradas → integração real | ✅ Concluída e validada (aguardando aprovação p/ Fase 4) |
| 4 | Integridade do banco (FKs, índices, migrations) | ✅ Concluída (DB-01 migrations parcial — tooling `dotnet ef` indisponível) |
| 5 | Refatoração (AsNoTracking) | ✅ Concluída |
| 6 | Reformulação UX/UI + Dashboard (design system com tokens) | ✅ Concluída |
| 7 | Tema Light/Dark + tematização por barbearia | ✅ Concluída (admin per-tenant: parcial; booking: completo) |
| 8 | Mobile-first | ✅ Verificada (layout já responsivo: drawer, grids, tabelas overflow, `dvh`) |
| 9 | QA final | ✅ Concluída (smoke test backend + build frontend) |

### Design system (Fases 6-7) — como funciona
- **Tokens** em `src/index.css` (`:root` = dark; `:root[data-theme="light"]` = light), em canais RGB para suportar opacidade do Tailwind.
- **Tailwind** (`tailwind.config.js`) mapeia cores semânticas: `bg-app`, `bg-surface`, `surfaceHover`, `border`, `content`, `muted`, `subtle`, `accent`, `accentFg`, `success/warning/danger/info`.
- **Componentes** (`btn-*`, `card`, `input`, `badge-*`) reescritos com tokens.
- **Tema:** `src/store/themeStore.ts` (Zustand) aplica `data-theme` no `<html>`, persiste em `localStorage["barbersaas-theme"]`, respeita `prefers-color-scheme`. Toggle (Sol/Lua) no topo do painel.
- **Migração:** todas as páginas tiveram as classes hardcoded (`gray-*`/`yellow-*`) trocadas por tokens.
- **Pendências visuais menores (abertas em AUDITORIA):** a11y de modais (Esc/foco — UX-01/02), validação com zod (FE-03), estados de erro de carregamento (UX-05), página 404 (FE-07), per-tenant theming no admin.

---

## 5. Fase 2 — Segurança (CONCLUÍDA, validada com 2 tenants reais)

| ID | Correção | Arquivo |
|---|---|---|
| SEC-01 | Removida confiança no header `X-Tenant-Id` (spoofing). Tenant vem só do JWT. | `src/BarberSaaS.API/Middlewares/TenantMiddleware.cs` |
| SEC-02 | `GetByIdAsync`: `FindAsync` → `FirstOrDefaultAsync` (respeita filtros, fecha IDOR). + checagem explícita de tenant no agendamento público. | `BaseRepository.cs`, `CreateAppointmentCommand.cs` |
| SEC-03 | Filtro multi-tenant lê o tenant **por requisição** (`CurrentTenantId` de instância) em vez de valor congelado no modelo cacheado. | `Infrastructure/Persistence/AppDbContext.cs` |
| SEC-04 | `[Authorize(Policy="RequireBarber")]` no nível da classe (POST/slots estavam anônimos). | `Controllers/v1/AppointmentsController.cs` |
| SEC-05 | Segredos (senha SQL `sa`, Redis, chave JWT) removidos do `appsettings.json` → via env var em prod. | `src/BarberSaaS.API/appsettings.json` |
| SEC-06 | JWT valida Issuer/Audience/Lifetime. | `Program.cs` |
| SEC-07 | `MapInboundClaims=false` + `RoleClaimType/NameClaimType="role"/"name"`. Corrige **403 em todo o admin** e `CurrentUser.Id` vazio. **Descoberto na validação.** | `Program.cs` |

**Validação (runtime, 2 tenants):** login demo OK; tenant B não vê dados de A; header `X-Tenant-Id` ignorado; IDOR (B bloquear cliente de A) → 404; POST `/appointments` sem token → 401; Owner cria cliente → 200.

### Gotchas de segurança aprendidos (importantes)
1. **`FindAsync` ignora query filters** do EF (tenant + soft-delete) → usar `FirstOrDefaultAsync`.
2. **Query filter com closure estático** congela o tenant no modelo cacheado → referenciar **propriedade de instância** do `DbContext` (`CurrentTenantId`).
3. **`MapInboundClaims` default = true** remapeia `role`→`ClaimTypes.Role` e `sub`→`NameIdentifier`, quebrando `RequireClaim("role",…)` e `FindFirst("sub")`. Desligar.
4. **A entidade `Tenant` é a raiz** — `TenantId` dela é vazio; NÃO pode ser filtrada por tenant (senão a própria linha some). Recebe só soft-delete. (ver §7)

---

## 6. Fase 3 — Funcionalidades (IMPLEMENTADA)

| ID | O que mudou | Arquivos | Validação |
|---|---|---|---|
| FE-02 | Edição de serviço (modal create/edit) + hook `useUpdateService` (PUT existente no backend). | `pages/admin/ServicesPage.tsx`, `features/services/servicesApi.ts` | ✅ Runtime OK (edição persiste) |
| FE-04 | `ConfigPage` tipada (`SettingsForm`) + envia números como **number**. (Obs.: o backend tolera string, então não era 400 — fix é de tipagem/correção.) | `pages/admin/ConfigPage.tsx` | ✅ Runtime OK |
| BE-04 | `GET /settings` blinda `Settings` nulo (remove CS8604) **+ projeta DTO anônimo** (corrige 500 por ciclo de serialização `Tenant↔Settings`). | `Controllers/v1/SettingsController.cs` | ✅ Runtime OK (GET/PUT 200) |
| FE-05 | Agendamento público: telefone obrigatório + validação com feedback (toast). | `pages/public/BookingPage.tsx` | ✅ Build OK |
| BE-03 | Dashboard: contagem diária real de agendamentos (era `0` fixo). | `Infrastructure/.../DashboardRepository.cs` | ✅ Runtime OK (200) |
| FE-06 | Removida variável `res` não usada. | `pages/auth/RegisterPage.tsx` | ✅ |
| extra | Removido import `ShiftDto` não usado (erro de `tsc` pré-existente). | `pages/admin/BarbersPage.tsx` | ✅ Build OK |

**Decisão do usuário:** o sino de notificações (FE-01) **fica para a Fase 6** (não há backend de notificações).

Build: backend compila limpo (sem CS8604); frontend `npm run build` (tsc + vite) **limpo**.

---

## 7. ✅ Fase 3 — verificação concluída (2 bugs extras corrigidos)

Durante a validação da Fase 3, dois efeitos colaterais do fix SEC-03 (filtro multi-tenant agora ativo de verdade) foram descobertos e **corrigidos**, ambos no endpoint `/settings`:

1. **404** — `GetWithSettingsAsync` consultava a entidade `Tenant` pelo filtro global, mas o `Tenant` raiz tem `TenantId` vazio → o predicado de tenant excluía a própria linha.
   **Fix:** em `AppDbContext.ApplyGlobalFilters`, a entidade `Tenant` recebe **apenas** soft-delete (sem predicado de tenant). Lookups de `Tenant` são sempre por Id/Slug (sem endpoint de listagem → sem enumeração).
2. **500** — `SettingsController.Get` devolvia a entidade EF crua `TenantSettings`, cuja navegação `Settings.Tenant` cria um **ciclo de referência** que o `System.Text.Json` não serializa.
   **Fix:** projeta um objeto anônimo com os campos usados.

**Validado em runtime:** `GET /settings` → 200; `PUT /settings` (números) persiste; isolamento multi-tenant mantido (tenant novo vê 0 clientes, demo vê 1); cada tenant lê o próprio `settings`.

**Próximo passo:** aguardando aprovação do usuário para iniciar a **Fase 4 (Integridade do banco)**.

---

## 8. Arquivos alterados nesta sessão

**Backend**
- `src/BarberSaaS.API/Middlewares/TenantMiddleware.cs` (SEC-01)
- `src/BarberSaaS.API/Controllers/v1/AppointmentsController.cs` (SEC-04)
- `src/BarberSaaS.API/Controllers/v1/SettingsController.cs` (BE-04)
- `src/BarberSaaS.API/Program.cs` (SEC-06, SEC-07)
- `src/BarberSaaS.API/appsettings.json` (SEC-05)
- `src/BarberSaaS.Infrastructure/Persistence/AppDbContext.cs` (SEC-03 + fix filtro Tenant)
- `src/BarberSaaS.Infrastructure/Persistence/Repositories/BaseRepository.cs` (SEC-02)
- `src/BarberSaaS.Infrastructure/Persistence/Repositories/DashboardRepository.cs` (BE-03)
- `src/BarberSaaS.Application/Appointments/Commands/CreateAppointment/CreateAppointmentCommand.cs` (SEC-02)

**Frontend**
- `src/pages/admin/ServicesPage.tsx`, `src/features/services/servicesApi.ts` (FE-02)
- `src/pages/admin/ConfigPage.tsx` (FE-04)
- `src/pages/public/BookingPage.tsx` (FE-05)
- `src/pages/auth/RegisterPage.tsx` (FE-06)
- `src/pages/admin/BarbersPage.tsx` (import não usado)

**Docs**
- `AUDITORIA.md` (Fase 1 + status), `AI_HANDOFF.md` (este arquivo)

---

## 9. Próximos passos sugeridos (após aprovação da Fase 3)

- **Fase 4 (Banco):** introduzir **migrations** versionadas (hoje é `EnsureCreatedAsync` — sem histórico/rollback, DB-01); varrer as ~12 `*Configuration.cs` (FKs/índices/constraints, DB-02).
- **Fase 5 (Refatoração):** `AsNoTracking` em leituras (BE-01); agregação do Dashboard em SQL em vez de memória (BE-02).
- **Fases 6–8 (UX/UI, tema, mobile):** reformulação visual (referências Stripe/Linear/Notion), light/dark + tematização por barbearia, acessibilidade dos modais (UX-01/02), sino funcional (FE-01).
- **Fase 9 (QA):** testar fluxos principais e de erro ponta a ponta.
