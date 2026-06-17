# PLANO DE REFATORAÇÃO — BarberSaaS

**Fase 0 — Diagnóstico (somente leitura, nada foi alterado).**
Data: 17/06/2026 · Autor: auditoria técnica/segurança/arquitetura.

> Resumo executivo: a base está **muito melhor do que um projeto "gerado por IA" típico** — arquitetura limpa de verdade, multi-tenancy bem feito, segurança sólida. Os ganhos maiores estão em **consistência arquitetural** (uniformizar como os controllers falam com a aplicação) e na **camada visual** (Fase 3). Não há nenhuma falha de segurança crítica de exploração trivial; há **hardening** a fazer.

---

## 1. Mapa real da arquitetura

### Backend — Clean Architecture (.NET 9), 4 camadas
```
BarberSaaS.Domain          Entidades, enums, eventos de domínio, exceções, interfaces de repositório.
        ▲                   Sem dependências. BaseEntity (Id, TenantId, IsDeleted, timestamps).
        │
BarberSaaS.Application     CQRS (MediatR) + FluentValidation + ValidationBehavior (pipeline).
        ▲                   Commands/Queries por feature. DTOs. Interfaces de serviços externos.
        │
BarberSaaS.Infrastructure EF Core (AppDbContext), repositórios, cache (Redis/memória),
        ▲                   serviços externos (Email, GoogleCalendar, Sms, Push), Hangfire jobs.
        │
BarberSaaS.API            Controllers v1, middlewares (Tenant, Exception), Program.cs (JWT,
                           CORS, rate limiting, Swagger, seed), wwwroot/uploads.
```

**Multi-tenancy:** `AppDbContext` aplica *global query filters* (soft-delete + `e.TenantId == CurrentTenantId`) em toda entidade `BaseEntity`. O tenant vem **exclusivamente do claim `tenant_id` do JWT** (via `TenantMiddleware`) — o antigo header `X-Tenant-Id` já foi removido (anti-spoofing). Fluxo público (anônimo) resolve o tenant pelo *slug* e **não** depende do filtro.

**Frontend — React 18 + Vite + TS + Tailwind**
```
pages/{admin,auth,public,client}   Telas. features/*  → hooks de dados (TanStack Query) por domínio.
store/*  Zustand (authStore, clientAuthStore, themeStore).   lib/*  axios (api/publicApi/clientApi), tema.
components/{layout,ui,admin,booking}   Vite proxy: /api e /uploads → http://localhost:5000.
```
Comunicação: SPA → `/api/v1/*` (proxy do Vite em dev). Token JWT no header `Authorization`. Três instâncias axios (painel, público, cliente) por terem tokens/escopos diferentes.

---

## 2. Achados de SEGURANÇA (classificados por severidade)

> Validei: segredos, auth por endpoint, isolamento por tenant, vazamento de dados sensíveis, validação de entrada.

### ✅ Pontos fortes confirmados (não são problemas — contexto)
- **Isolamento por tenant sólido.** Filtro global + tenant derivado só do JWT. No fluxo público (filtro desativado) o `CreateAppointmentHandler` faz **defesa explícita**: rejeita `serviceId`/`barberId` de outra barbearia (`service.TenantId != request.TenantId`). Testei a lógica — fecha o buraco de cross-tenant booking.
- **Todos os controllers de gestão exigem policy** (`RequireOwner`/`RequireOwnerOrAdmin`/`RequireBarber`/`RequireClient`). Nenhum `[AllowAnonymous]` indevido. Anônimos só `Auth`, `ClientAuth` e `Public` — por design, e com **rate limiting** (`auth` 5/15min, `booking` 10/min).
- **Nenhum DTO vaza** `PasswordHash`/`OtpCode`/`TokenHash`. `appsettings.json` (versionável) está **limpo** — segredos por env var, com comentário explicando.
- **Validação de entrada** via FluentValidation + `ValidationBehavior` no pipeline do MediatR.
- Refresh token guardado como **hash** (SHA-256), lookup por hash.

### 🔴 ALTA (condicional, mas impacto severo) — corrigir na Fase 1
1. **JWT pode iniciar com chave vazia em produção (fail-open).** `Program.cs`: `var jwtKey = builder.Configuration["Jwt:SecretKey"]!;`. Se a env var não for provida em prod, o app **sobe assinando tokens com chave vazia** → tokens forjáveis. Correção: *fail-fast* no boot (exige ≥32 chars senão lança e não inicia).

### 🟠 MÉDIA — Fase 1
2. **Segredo de dev versionável.** `appsettings.Development.json` contém uma `Jwt:SecretKey` real em texto. Hoje não há git no projeto; ao rodar `git init` (necessário para os checkpoints que você pediu), isso **vazaria no repo**. Correção: `.gitignore` cobrindo `appsettings.Development.json`, `*.db`, `bin/`, `obj/`; mover o segredo para `dotnet user-secrets`.
3. **OTP do cliente em texto puro no banco** (`Client.OtpCode`). Curto (5 min), mas defesa-em-profundidade pede hash. Correção: guardar hash do OTP e comparar por hash.
4. **Dashboard do Hangfire sem auth fora de produção** (`!IsProduction()` ⇒ exposto também em *staging*). Restringir a Development ou proteger com filtro de autorização.

### 🟡 BAIXA — Fase 1 ou 2
5. `ExceptionMiddleware` devolve a mensagem de `InvalidOperationException` ao cliente (pequena divulgação de detalhe interno). Mapear para mensagens de domínio.
6. `AllowedHosts: "*"` e access token de **8h** em dev. Aceitável em dev; revisar para prod.

---

## 3. Dívida técnica (sem impacto funcional, mas custa manutenção)

### Backend
- **Inconsistência arquitetural (principal).** 9/14 controllers usam CQRS/MediatR; **5 falam direto com repositórios/DbContext**: `Settings`, `Uploads`, `Products`, `Clients`, `Client`. Resultado: regra de negócio vaza para o controller (ex.: o `PUT /settings` tinha lógica de atribuição inline — foi onde o bug das fotos morava). Padronizar tudo em commands/queries deixa os controllers magros e testáveis.
- **DTOs de request/response definidos dentro dos controllers** (`UpdateSettingsRequest`, `PublicBookingRequest`, etc.) e **projeções com objeto anônimo** repetidas (Settings GET, Public GET). Mover para DTOs tipados, consistentes.
- **Resolução de tenant por slug duplicada** em ~6 ações do `PublicController` (`GetBySlugAsync` + null-check). Extrair para um filtro/base.
- **Pastas a revisar** quanto a código morto/stub: `Infrastructure/Identity`, `Infrastructure/Domain`, `ExternalServices/{Email,Push,GoogleCalendar}` (confirmar o que é usado de fato vs. esqueleto).

### Frontend
- **Componentes de página grandes** misturando dados + UI (`BookingPage` ~300 linhas, `ConfigPage`, `ClientAccountPage`). Extrair sub-componentes e hooks.
- **Tokens de tema legados** (`--color-primary/secondary/accent`) hoje quase sem uso após a unificação no `--accent`. Limpar.
- Falta uma **biblioteca de componentes base** (`components/ui` existe mas subutilizada): Button, Input, Card, Modal, Badge, Skeleton, EmptyState padronizados — base para a Fase 3.

> Observação honesta: os **comentários do código são bons e com propósito** (explicam o filtro de tenant, `MapInboundClaims`, defesa cross-tenant). Não vi o típico "comentário genérico de IA". A "cara de IA" a combater está mais no **visual** (Fase 3) do que no backend.

---

## 4. Plano de fases proposto (alinhado ao seu pedido)

Cada fase: investiga → muda em blocos pequenos → **build passa + fluxo funciona** → commit → **paro e espero seu OK**.

| Fase | Escopo | Entregáveis | Risco |
|---|---|---|---|
| **0** | Diagnóstico (este doc) | `PLANO_REFATORACAO.md` | nenhum |
| **1 — Segurança** | `git init` + `.gitignore`; fail-fast da chave JWT; segredo dev → user-secrets; hash de OTP; Hangfire protegido; mensagens de erro. Teste de isolamento cross-tenant ponta a ponta. | commits pequenos por item + relatório causa/validação | baixo |
| **2 — Reestruturação** | Padronizar os 5 controllers fora do CQRS; DTOs tipados; extrair resolução de tenant; remover código morto confirmado. **Sem mudar comportamento.** | build verde + fluxos ok a cada bloco | médio (mitigado por blocos) |
| **3 — Identidade visual** | 3.1 Design System (paleta/tipografia/tokens/componentes) + style guide vivo **para aprovar antes de aplicar**; 3.2 aplicar tela a tela; 3.3 animações/micro-interações; 3.4 responsividade. | guia + telas | médio |
| **4 — QA final** | E2E: dono cadastra/personaliza (cor/foto refletem), cliente agenda, login, light/dark, mobile, isolamento. Build limpo. | checklist QA | baixo |

### Pré-requisito da Fase 1 (preciso do seu OK)
O projeto **não é um repositório git**. Para entregar os *checkpoints/commits* que você pediu, a primeira ação da Fase 1 será `git init` + `.gitignore` (excluindo segredos, `.db`, `bin/obj`) e um commit inicial do estado atual. Sem isso, não há como versionar por fase.

---

## 5. O que NÃO farei sem aprovação
- Não inicio a Fase 1 antes do seu OK.
- Não troco comportamento durante a Fase 2 (refactor ≠ feature).
- Não aplico o visual novo (3.2+) antes de você aprovar o Design System (3.1).
- Não instalo libs novas (animação etc.) sem avisar.
