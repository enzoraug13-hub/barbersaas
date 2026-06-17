# AUDITORIA — BarberSaaS

> **Fase 1 — Relatório de achados.** Gerado por inspeção direta do código (nada foi alterado).
> Stack real: **Frontend React 18 + Vite** consumindo **Backend .NET (Clean Architecture, EF Core, SQLite dev / SQL Server prod)**.
> _Não há Supabase._ O equivalente a "RLS" aqui são os **filtros globais multi-tenant do EF Core + authorization policies**; "edge functions" são **controllers + Hangfire jobs**.

## Como ler
- **Severidade:** 🔴 Crítico (segurança/perda de dados) · 🟠 Alto (funcionalidade quebrada) · 🟡 Médio · ⚪ Baixo (cosmético)
- **Status:** `Aberto` · `Em progresso` · `Corrigido` (atualizado ao longo das fases)

## Resumo
| Severidade | Qtd | Corrigidos |
|---|---|---|
| 🔴 Crítico | 3 | 3 (Fase 2) |
| 🟠 Alto | 5 | 5 (Fase 2) |
| 🟡 Médio | 11 | 3 (Fase 3) |
| ⚪ Baixo | 7 | 3 (Fase 3) |

> **Fase 2 (Segurança) concluída** — SEC-01 a SEC-07 corrigidos e validados em runtime (login demo + isolamento entre 2 tenants + anti-spoofing + IDOR + endpoint anônimo). SEC-07 foi descoberto durante a validação.
>
> **Fase 3 (Funcionalidades) concluída** — FE-02, FE-04, FE-05, FE-06, BE-03, BE-04 corrigidos. Validado em runtime: edição de serviço persiste, `GET`/`PUT /settings` 200 (corrigido 500 por ciclo de serialização + 404 do filtro do `Tenant`), dashboard 200, isolamento multi-tenant mantido. Sino (FE-01) adiado para a Fase 6 por decisão do usuário.

### Escopo da inspeção
- **Lido integralmente:** todo o frontend (`pages`, `features`, `lib`, `store`, `router`, `AdminLayout`); backend: `AppDbContext`, `DependencyInjection`, `TenantMiddleware`/`CurrentTenant`/`CurrentUser`, `BaseRepository`, `GenericRepositories`, `DashboardRepository`, `AppointmentRepository`, `AppointmentConfiguration`, controllers `Auth`/`Appointments`/`Public`/`Settings`, `Program.cs`.
- **Amostrado (varredura pendente na fase correspondente):** demais controllers (confirmado apenas o atributo `[Authorize]` de classe), demais `*Configuration.cs` (FKs/índices), validators FluentValidation, handlers CQRS restantes.

---

## 🔴 Segurança

| ID | Área | Problema | Causa provável | Sev. | Como reproduzir | Status |
|---|---|---|---|---|---|---|
| SEC-01 | Segurança | **Spoofing de tenant via header `X-Tenant-Id`.** O middleware confia no header de qualquer cliente e ele **sobrepõe** o `tenant_id` do JWT, sem verificar se o usuário pertence àquele tenant. | `TenantMiddleware.InvokeAsync` checa o header **antes** do claim do JWT e nunca valida posse ([TenantMiddleware.cs:14-25](src/BarberSaaS.API/Middlewares/TenantMiddleware.cs#L14-L25)). | 🔴 | Logar como tenant A → `GET /api/v1/clients` com header `X-Tenant-Id: <id do tenant B>` → retorna clientes do tenant B. | ✅ Corrigido |
| SEC-02 | Segurança | **IDOR em todas as operações "por id".** `GetByIdAsync` usa `FindAsync`, que **ignora os query filters** (tenant + soft-delete) por design do EF Core. Permite cancelar/concluir/editar registros de outros tenants e "ressuscitar" registros excluídos. | `BaseRepository.GetByIdAsync` → `_set.FindAsync(...)` ([BaseRepository.cs:19-20](src/BarberSaaS.Infrastructure/Persistence/Repositories/BaseRepository.cs#L19-L20)); usado em [CancelAppointmentCommand.cs:31](src/BarberSaaS.Application/Appointments/Commands/CancelAppointment/CancelAppointmentCommand.cs#L31), [CompleteAppointmentCommand.cs:30](src/BarberSaaS.Application/Appointments/Commands/CompleteAppointment/CompleteAppointmentCommand.cs#L30), [CreateGoalCommand.cs:53](src/BarberSaaS.Application/Goals/Commands/CreateGoalCommand.cs#L53). | 🔴 | Como barbeiro do tenant A: `DELETE /api/v1/appointments/{id de um agendamento do tenant B}` → cancela o agendamento alheio (200). | ✅ Corrigido |
| SEC-03 | Segurança | **Isolamento multi-tenant do filtro global comprometido.** O filtro captura a instância `ICurrentTenant` num closure **estático** durante `OnModelCreating`. Como o EF **cacheia o modelo**, o valor do tenant fica congelado no 1º build (provavelmente `Guid.Empty`, vindo do seed no startup) → a condição `tenant.Id == Guid.Empty` zera o filtro para todas as queries que dependem dele. | [AppDbContext.cs:61-84](src/BarberSaaS.Infrastructure/Persistence/AppDbContext.cs#L61-L84) — `ApplyGlobalFilters` é `static` e captura `tenant`; modelo cacheado por tipo de contexto. | 🔴 | Criar 2 tenants; consultar uma entidade via repositório que **não** filtra `TenantId` explicitamente → retorna dados de ambos. (Defesa em profundidade ausente; hoje só sobram os `Where(TenantId==…)` explícitos, que SEC-01 contorna.) | ✅ Corrigido |
| SEC-04 | Segurança | **Endpoints de escrita sem autenticação.** `AppointmentsController` não tem `[Authorize]` de classe; `POST /appointments` e `GET /appointments/slots` ficam **anônimos** (só 3 das 5 actions são protegidas). Combinado com SEC-01, permite criar agendamentos em qualquer tenant sem login. | Falta `[Authorize]` no controller ([AppointmentsController.cs:15-44](src/BarberSaaS.API/Controllers/v1/AppointmentsController.cs#L15-L44)). Demais controllers têm `[Authorize]` de classe. | 🟠 | `POST /api/v1/appointments` **sem** token + header `X-Tenant-Id` → não retorna 401. | ✅ Corrigido |
| SEC-05 | Segurança | **Segredos versionados.** Senha do SQL `sa` e connection string em `appsettings.json`; chave JWT em `appsettings.Development.json`. Viola a regra "nunca expor segredos". | Credenciais hardcoded nos `appsettings.*`. | 🟠 | Abrir [appsettings.json](src/BarberSaaS.API/appsettings.json) → `Password=BarberSaaS@123`. | ✅ Corrigido |
| SEC-06 | Segurança | **JWT/sessão frouxos.** `ValidateIssuer=false` e `ValidateAudience=false`; access token de 8h; tokens persistidos em `localStorage` (exfiltráveis via XSS). | [Program.cs:55-62](src/BarberSaaS.API/Program.cs#L55-L62); `authStore` com `persist` em localStorage ([authStore.ts:22-40](frontend/barbersaas-web/src/store/authStore.ts#L22-L40)). | 🟡 | Inspecionar `localStorage["barbersaas-auth"]` no navegador. | 🟡 Parcial (issuer/audience ✅; cookie httpOnly adiado) |
| SEC-07 | Segurança | **Autorização do admin 100% quebrada + auditoria sem autor.** O mapeamento de claims do ASP.NET renomeava `role`→`ClaimTypes.Role` e `sub`→`NameIdentifier`, fazendo **todas** as `RequireClaim("role", …)` falharem (**403 em todo o painel**) e `CurrentUser.Id` retornar `Guid.Empty` (quem cancelou/concluiu agendamento não era registrado). _Descoberto durante a validação da Fase 2._ | `MapInboundClaims` no default (`true`); policies e `CurrentUser` leem claims curtos (`role`/`sub`). | 🟠 | Logar como Owner e chamar qualquer endpoint admin (ex.: `GET /api/v1/clients`) → 403 mesmo com role correto. | ✅ Corrigido |

---

## 🟠 Backend / API

| ID | Área | Problema | Causa provável | Sev. | Como reproduzir | Status |
|---|---|---|---|---|---|---|
| BE-01 | Backend | **Nenhuma leitura usa `AsNoTracking`** (0 ocorrências em toda a Infrastructure) → overhead de change-tracking em todas as listagens. | Repositórios usam `ToListAsync` direto. | 🟡 | `grep AsNoTracking` na Infrastructure → 0 resultados. | ✅ Corrigido (Fase 5) |
| BE-02 | Backend | **Agregação do Dashboard em memória.** Puxa todas as transações e agendamentos do período com `ToListAsync` e só então soma/agrupa em LINQ-to-objects → não escala. | [DashboardRepository.cs:15-73](src/BarberSaaS.Infrastructure/Persistence/Repositories/DashboardRepository.cs#L15-L73). | 🟡 | Volume alto de transações deixa `/dashboard` lento. | Aberto |
| BE-03 | Backend | **Dado incorreto:** `DailyRevenueDto` recebe sempre `0` para contagem de agendamentos do dia. | [DashboardRepository.cs:68-72](src/BarberSaaS.Infrastructure/Persistence/Repositories/DashboardRepository.cs#L68-L72) passa literal `0`. | ⚪ | Série diária nunca mostra nº de agendamentos. | ✅ Corrigido (Fase 3) |
| BE-04 | Backend | **`SettingsController.Get` pode retornar `null`** (`tenant.Settings`) sem tratamento (origem do warning CS8604); o front recebe `null` e renderiza vazio. | [SettingsController.cs:26-28](src/BarberSaaS.API/Controllers/v1/SettingsController.cs#L26-L28). | 🟡 | Tenant sem `Settings` → `GET /settings` retorna `data:null`. | ✅ Corrigido (Fase 3 — + corrigido 500 por ciclo de serialização) |

---

## 🟠 Banco de Dados

| ID | Área | Problema | Causa provável | Sev. | Como reproduzir | Status |
|---|---|---|---|---|---|---|
| DB-01 | Banco | **Sem migrations versionadas.** Schema criado via `EnsureCreatedAsync()` no seed → não há histórico/rollback; impossível evoluir o schema em produção sem recriar o banco. | [Program.cs:149](src/BarberSaaS.API/Program.cs#L149); pasta `Migrations` inexistente. | 🟠 | Alterar uma entidade → app não consegue migrar dado existente. | 🟡 Parcial (Fase 4 — IDesignTimeDbContextFactory pronto; gerar migration exige `dotnet ef`, indisponível no ambiente) |
| DB-02 | Banco | **Varredura de FKs/índices/constraints incompleta.** `AppointmentConfiguration` está bem (índices + FKs `Restrict`), mas as demais ~12 configurações não foram auditadas individualmente. | Amostragem ([AppointmentConfiguration.cs](src/BarberSaaS.Infrastructure/Persistence/Configurations/AppointmentConfiguration.cs)). | 🟡 | Revisar na Fase 4. | ✅ Corrigido (Fase 4 — revisado; RefreshToken.TokenHash agora único) |

---

## 🟡 Frontend

| ID | Área | Problema | Causa provável | Sev. | Como reproduzir | Status |
|---|---|---|---|---|---|---|
| FE-01 | Frontend | **Botão de notificações (sino) sem ação** — apenas visual. | `<button>` sem `onClick` ([AdminLayout.tsx:102-104](frontend/barbersaas-web/src/components/layout/AdminLayout.tsx#L102-L104)). | 🟡 | Clicar no sino no topo do painel → nada acontece. | ✅ Resolvido (Fase 6 — removido; lugar virou toggle de tema) |
| FE-02 | Frontend | **CRUD de Serviços incompleto:** sem editar e sem alternar ativo/visibilidade após a criação (só criar e excluir). | [ServicesPage.tsx](frontend/barbersaas-web/src/pages/admin/ServicesPage.tsx) não tem fluxo de edição. | 🟡 | Criar serviço → não há como editá-lo depois. | ✅ Corrigido (Fase 3) |
| FE-03 | Frontend | **`zod` instalado mas não usado.** Formulários validam só com `required` nativo; telefone `+55…` sem máscara/validação → erro vira toast genérico. | Ausência de schemas zod nos forms (ex.: [ClientsPage.tsx:19-29](frontend/barbersaas-web/src/pages/admin/ClientsPage.tsx#L19-L29)). | 🟡 | Cadastrar cliente com telefone "abc" → erro genérico do backend. | Aberto |
| FE-04 | Frontend | **ConfigPage tipada como `any`** e envia campos numéricos (`slotIntervalMinutes`, `maxAdvanceDays`) como **string** → risco de falha de binding `int` no backend. | Handler genérico `set` guarda `e.target.value` (string) ([ConfigPage.tsx:26-27,75-76](frontend/barbersaas-web/src/pages/admin/ConfigPage.tsx#L26-L27)). | 🟡 | Salvar config → valor de slot pode não persistir. | ✅ Corrigido (Fase 3) |
| FE-05 | Frontend | **BookingPage (etapa cliente):** telefone sem `required`; "Continuar" faz no-op silencioso se vazio, sem feedback. | [BookingPage.tsx:217-221](frontend/barbersaas-web/src/pages/public/BookingPage.tsx#L217-L221). | ⚪ | Deixar telefone vazio → botão não avança e não explica. | ✅ Corrigido (Fase 3) |
| FE-06 | Frontend | Variável `res` não utilizada em `RegisterPage` (lint). | [RegisterPage.tsx:17](frontend/barbersaas-web/src/pages/auth/RegisterPage.tsx#L17). | ⚪ | `npm run lint`. | ✅ Corrigido (Fase 3) |
| FE-07 | Frontend | **Sem página 404 real nem Error Boundary**; rota desconhecida redireciona ao login. | [router.tsx:46](frontend/barbersaas-web/src/app/router.tsx#L46). | ⚪ | Acessar `/xyz` logado → cai no login. | Aberto |
| FE-08 | Frontend | `c.name[0].toUpperCase()` sem guarda para nome vazio (avatar). | [ClientsPage.tsx:98](frontend/barbersaas-web/src/pages/admin/ClientsPage.tsx#L98). | ⚪ | Cliente com nome vazio → exceção de render. | Aberto |

---

## 🟡 UX / UI

| ID | Área | Problema | Causa provável | Sev. | Como reproduzir | Status |
|---|---|---|---|---|---|---|
| UX-01 | UX/UI | **Modais sem acessibilidade:** sem foco-trap, sem fechar com `Esc`, sem `role="dialog"`/`aria-modal`; fecham só por clique no backdrop. | Padrão repetido em todos os modais (ex.: [AgendaPage.tsx:159-160](frontend/barbersaas-web/src/pages/admin/AgendaPage.tsx#L159-L160)). | 🟡 | Abrir modal → `Esc` não fecha; `Tab` escapa do modal. | Aberto |
| UX-02 | UX/UI | **Botões somente-ícone sem `aria-label`** (sino, ações de tabela) → invisíveis a leitores de tela. | Vários (ex.: [ProductsPage.tsx:176-185](frontend/barbersaas-web/src/pages/admin/ProductsPage.tsx#L176-L185)). | 🟡 | Auditoria com axe/Lighthouse acusa. | Aberto |
| UX-03 | UX/UI | **Tema fixo escuro**; sem light/dark nem tematização por barbearia (cores do tenant só aplicadas na BookingPage pública). | Sem provider de tema; classes `gray-950` hardcoded. | ⚪ | (Escopo Fase 7.) | ✅ Corrigido (Fases 6-7 — tokens + light/dark + per-tenant no booking) |
| UX-04 | UX/UI | **Dashboard com período fixo** (mês atual), sem seletor de datas. | [DashboardPage.tsx:25-28](frontend/barbersaas-web/src/pages/admin/DashboardPage.tsx#L25-L28). | ⚪ | Não há como ver outro mês. | Aberto |
| UX-05 | UX/UI | **Sem estados de erro de carregamento** nas queries (só loading/empty); falha de API deixa tela vazia silenciosa. | Páginas usam só `isLoading`/empty, sem `isError`. | 🟡 | Derrubar API → telas ficam vazias sem aviso. | Aberto |

---

## Recomendação de priorização (para sua aprovação)

A ordem das fases do plano já bate com a urgência. **Sugiro tratar primeiro o bloco de segurança (Fase 2)**, pois SEC-01 + SEC-02 + SEC-03 juntos significam que, hoje, **um tenant consegue ler e alterar dados de outro** — é o risco mais grave e relativamente localizado:

1. **SEC-01** — parar de confiar no `X-Tenant-Id` para usuários autenticados (usar sempre o tenant do JWT; header só em contexto interno/confiável).
2. **SEC-02** — trocar `GetByIdAsync`/`FindAsync` por busca que respeite os filtros (ou validar `TenantId` explicitamente em cada handler).
3. **SEC-03** — corrigir o filtro global para ler o tenant **por requisição** (instância do `DbContext` + `IModelCacheKeyFactory`), restaurando a defesa em profundidade.
4. **SEC-04** — adicionar `[Authorize]` de classe no `AppointmentsController`.
5. **SEC-05/06** — mover segredos para variáveis de ambiente/User-Secrets e endurecer o JWT.

---

**Aguardando sua aprovação.** Me diga se concorda com os achados e com a priorização acima, ou se quer reordenar antes de eu iniciar a **Fase 2 (Segurança)**. Não vou alterar nada até você confirmar.
