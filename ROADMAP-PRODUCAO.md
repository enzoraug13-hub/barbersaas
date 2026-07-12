# ROADMAP — Caminho até Produção (100%)

> Diagnóstico honesto do estado atual. **Não altera nada** — só mapeia o que falta para rodar
> painel admin + área do cliente em produção de verdade.
> Gerado em 2026-06-26. Base: leitura direta do código no working tree (inclui mudanças ainda
> **não commitadas** — ver nota abaixo).

## Veredito em uma frase

O **núcleo está sólido e mais maduro do que a premissa do pedido sugeria**: multi-tenant com
isolamento real, fail-fasts de segurança no boot, migration de SQL Server já gerada e upload de
logo já implementado. O que falta para "100% produção" **não é reescrever** — é **(a) configurar
infra/host real, (b) ligar serviços externos (email/SMS), (c) resolver 3 pontos que quebram em
produção mas passam em dev (upload em disco, migrate-on-startup, segredos) e (d) decidir o que fazer
sobre cobrança/assinatura, que hoje não existe**. Estimativa realista: **não é um fim de semana, mas
também não é um mês** — é da ordem de **1 a 2 semanas** de trabalho focado, sendo a maior incerteza
o item de pagamentos (depende do modelo de negócio).

> ⚠️ **Atenção — trabalho não commitado:** o `git status` mostra ~60 arquivos modificados e a
> migration antiga `20260616...` deletada / nova `20260623...InitialCreate` adicionada. Boa parte
> das features citadas aqui (upload de logo, migration de SQL Server) está **no working tree, ainda
> não commitada**. **Commitar isso é pré-requisito de qualquer deploy** — não dá pra ir a produção
> com o trabalho só na sua máquina.

**Legenda de severidade:** 🔴 Bloqueador (sem isso não funciona / não sobe) · 🟠 Importante (sobe mas
quebra na primeira hora real) · 🟡 Melhoria (dá pra adiar pós-launch).

---

## 1. Deploy / Infra

### 1.1 Backend (.NET 9) — onde e como roda

**Hoje (local):**
```
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project src\BarberSaaS.API\BarberSaaS.API.csproj   # http://localhost:5000
```
Em `Development` ele cria/seed o SQLite (`barbersaas_dev.db`) sozinho e expõe Swagger + dashboard do
Hangfire. Nada disso roda em produção (tudo gated por `IsDevelopment()` no `Program.cs`).

**O Vercel não roda .NET.** O backend precisa de um host que execute um processo ASP.NET contínuo.
Opções, do mais simples ao mais controlável:

| Opção | Prós | Contras |
|---|---|---|
| **Railway / Render** | Deploy direto do repo, SQL Server gerenciado ou Postgres, fácil de variável de ambiente | Custo escala; região fora do BR pode dar latência |
| **Azure App Service + Azure SQL** | Stack natural .NET + SQL Server, "filesystem" persistente, fácil migrar | Mais caro, curva de portal |
| **Fly.io / VPS + Docker** | Controle total, região BR (GRU), barato | Você opera tudo (TLS, backups, monitor) |

🔴 **Bloqueadores de infra no backend:**
- **Não há (confirmado por leitura) `Dockerfile` nem pipeline de CI/CD** — ⚠️ *verificar*: minha
  varredura não encontrou, mas a checagem final foi interrompida. Sem container/CI, todo deploy é
  manual. Para qualquer host moderno, criar um `Dockerfile` multi-stage (`dotnet publish -c Release`)
  é o caminho.
- **Redis é obrigatório em produção** — o próprio `Program.cs:37-39` faz *fail-fast*: sem
  `ConnectionStrings__Redis`, o app **não sobe**. É usado para reserva de slot (anti-overbooking) e
  para o desafio de OTP do login do cliente. Então produção exige **um Redis gerenciado** além do banco.
- **Hangfire em produção usa SQL Server** (`DependencyInjection.cs:113-124`) — depende da mesma
  connection string do banco. OK, mas confirma que o banco de prod precisa ser SQL Server (ver 1.2).

### 1.2 Banco — SQLite (dev) → SQL Server (prod)

**Hoje:** SQLite em dev, criado via `EnsureCreatedAsync()` dentro do seed (`Program.cs:184`), que só
roda em `Development`. O `DependencyInjection.cs:27-36` **detecta automaticamente** o provider pela
connection string (`Data Source=` → SQLite; qualquer outra → SQL Server). Então trocar de banco é
só trocar a env var `ConnectionStrings__Default`.

**Atualização importante sobre a nota DB-01 da auditoria:** a `AUDITORIA.md` registra DB-01 como
"🟡 Parcial — gerar migration exige `dotnet ef`, indisponível no ambiente". **Isso mudou no working
tree:** existe agora `src/BarberSaaS.Infrastructure/Migrations/20260623120023_InitialCreate.cs`, e ela
é **flavored para SQL Server** (colunas `nvarchar(max)`, `uniqueidentifier`, `datetime2`). Ou seja, a
migration de produção **já foi gerada** — a antiga foi deletada e substituída (visível no `git status`).
DB-01 está, na prática, **resolvido — mas não commitado**.

🔴 **Bloqueador de banco que ninguém percebe até subir:** o `Program.cs` **só cria/migra o schema em
Development** (via `EnsureCreatedAsync`, dentro do `if (IsDevelopment())`). **Não há chamada de
`db.Database.Migrate()` para produção em lugar nenhum.** Consequências:
  - Em produção, **nada cria as tabelas automaticamente** — você precisa rodar a migration "à mão"
    (`dotnet ef database update` apontando para o SQL Server de prod) **ou** adicionar um
    `await db.Database.MigrateAsync()` no boot (fora do bloco de dev).
  - **`EnsureCreatedAsync` e migrations são mutuamente incompatíveis**: `EnsureCreated` cria o schema
    sem gravar na tabela `__EFMigrationsHistory`, então depois `Migrate` recusa aplicar. A escolha
    para prod tem que ser **migrations** (mantém histórico/rollback, que é o ponto do DB-01).

🟠 **Seed inicial em produção:** o seed (planos Gratuito/Profissional/Premium + tenant demo) é
dev-only. Em produção, **os planos não são semeados** — e a tela de cadastro/assinatura depende deles
existirem. Precisa de um seed de produção **só dos Plans** (sem o tenant demo), idealmente idempotente.

### 1.3 Frontend (React) — pode ir no Vercel

**Hoje:** Vite + React 18, `npm run dev` na :5173 com proxy `/api → :5000`. Em produção é estático
(`npm run build` → `dist/`) — **Vercel serve isso perfeitamente.**

🔴 **Bloqueador de configuração do frontend:** em dev o front fala com o back via **proxy do Vite**.
**Em produção (Vercel) não existe esse proxy.** O `lib/api.ts:4` resolve a base assim:
```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'
```
Se você **não** definir `VITE_API_URL` no build do Vercel, o front vai chamar `/api/v1` no **próprio
domínio do Vercel** — onde o backend não existe → tudo dá 404/erro de rede. **É obrigatório** setar
no Vercel:
```
VITE_API_URL = https://api.seudominio.com.br/api/v1
```
(variável de **build**, com prefixo `VITE_`; reconstruir após mudar). Não há `.env.production` nem
`vercel.json` no repo hoje — ⚠️ *verificar/criar*.

🟡 SPA fallback: garantir no Vercel que rotas client-side (`/agenda`, `/style-guide`, `/{slug}`)
caiam no `index.html` (rewrite `/(.*) → /index.html`). Sem isso, F5 numa rota interna dá 404.

### 1.4 Conexão front ↔ back em produção (CORS + URL)

O backend já lê origens permitidas de env var (`Program.cs:116-120`):
```csharp
p.WithOrigins(config["Cors:Origins"]?.Split(",") ?? ["http://localhost:5173"])
 .AllowAnyMethod().AllowAnyHeader().AllowCredentials()
```
🟠 **Para produção:**
- Setar `Cors__Origins` = origem exata do front no Vercel (ex.: `https://app.seudominio.com.br`).
  **Sem barra final, com `https://`.** Como há `AllowCredentials()`, **não pode** usar `*`.
- Setar `AllowedHosts` (hoje `*` no `appsettings.json:34`) para o domínio real da API.
- Front e back em **domínios/subdomínios diferentes** (Vercel × host do .NET): funciona via CORS, mas
  confira se o refresh token (cookie/localStorage) atravessa. Hoje o token vai em `localStorage`
  (`store/authStore` → `Bearer` header), então CORS basta — não depende de cookie cross-site.

---

## 2. Funcionalidades incompletas

### 🔴 Bloqueadores (sem isso, fluxo principal não funciona em produção)

| # | Item | Estado real | Por que bloqueia |
|---|---|---|---|
| B1 | **Login do cliente por OTP (SMS)** | Twilio **codado** (`TwilioSmsService.cs`), mas sem credenciais cai no `LogSmsService` que **só loga e não envia** (`IsConfigured=false` → API devolve o código na resposta, só pra dev). | A **área do cliente inteira** depende de receber o código por SMS. Em produção sem Twilio, o cliente **nunca recebe o código** e não consegue entrar. Precisa de conta Twilio + número + `Sms__Twilio__AccountSid/AuthToken/FromNumber`. |
| B2 | **Redis provisionado** | Fail-fast no boot exige (`Program.cs:37`). | App **não sobe** sem `ConnectionStrings__Redis`. Reserva de slot e OTP dependem dele. |
| B3 | **Migrate do schema em produção** | Migration existe, mas nada a aplica em prod (ver 1.2). | Sem rodar a migration, **não há tabelas** → primeira request quebra. |
| B4 | **Upload de logo/capa persistente** | **Já existe** (`UploadsController.cs`, `ImageField.tsx`, abas "Fotos" na `ConfigPage.tsx:206-209`). **Mas grava em disco local** (`wwwroot/uploads/{tenantId}`). | O próprio controller avisa (`linha 10`): *"Em produção, trocar por blob storage"*. Filesystem da maioria dos hosts é **efêmero** (some no redeploy) e **não é compartilhado entre instâncias** → logo "desaparece". Precisa de S3/Azure Blob/R2 mantendo o mesmo contrato (`POST /uploads` → `{ url }`). |

> **Correção da premissa do pedido:** o upload de logo **já está na tela Identidade/Config** (campos
> Logo e Imagem de capa, com preview), e a entidade `TenantSettings` já tem `LogoUrl`/`CoverImageUrl`.
> O que falta **não é a tela** — é trocar o armazenamento de disco local por blob (B4).

### 🟠 Importante (sobe, mas a operação real esbarra rápido)

| # | Item | Estado real |
|---|---|---|
| I1 | **Email transacional (SendGrid)** | Codado (`EmailService.cs`), mas sem `SendGrid:ApiKey` ele **só loga "não enviado" e segue**. Confirmações/lembretes por email não saem. Precisa de API key **+ domínio remetente verificado** (SPF/DKIM) senão cai em spam. |
| I2 | **Lembretes 24h (Hangfire)** | Job recorrente registrado (`Program.cs:164-167`) e roda — **mas o canal de entrega depende de I1/B1**. Sem email/SMS configurados, o job roda e não entrega nada. |
| I3 | **Seed dos Plans em produção** | Ver 1.2 — sem os planos, cadastro/assinatura referencia plano inexistente. |
| I4 | **Dashboard do Hangfire** | Desligado em prod de propósito (`Program.cs:159`, sem auth). OK — só registrar que **não há observabilidade** dos jobs em prod até criar um `IDashboardAuthorizationFilter`. |

### 🟡 Melhorias (pós-launch)

| # | Item | Estado |
|---|---|---|
| M1 | **Pagamentos / cobrança de assinatura** | **Não existe** nenhuma integração (sem Stripe/MercadoPago/Pagar.me, sem checkout, sem webhook). Existe a entidade `Subscription` + `Plan` com preços, status `Trial/Active`, `TrialEndsAt`, `MaxBarbers`, `MaxAppointmentsPerMonth` — mas **nada é cobrado e nada é forçado**: não há middleware que bloqueie tenant com trial expirado nem que respeite `MaxBarbers`. **Se o modelo é cobrar pelo SaaS, isso vira bloqueador**; se o onboarding é manual (você ativa cada barbearia), dá pra lançar sem e cobrar por fora. **Decisão de negócio, não técnica.** |
| M2 | **Pagamento do cliente no agendamento** | O `PaymentMethod` (Pix/Crédito/Débito/Dinheiro) é **registro manual** de como foi pago — não há gateway/cobrança online no booking. Provavelmente é o desejado (pagamento no balcão), mas registrar que **não há pagamento online de serviço**. |
| M3 | **Google Calendar** | `GoogleCalendarService` é stub. Feature de plano pago, dá pra adiar. |
| M4 | **Página 404 / Error Boundary** | FE-07 da auditoria, ainda aberto: rota desconhecida joga no login. |
| M5 | **zod nos formulários** | FE-03 aberto: validação ainda por `required` nativo em vários forms. |

---

## 3. Segurança / Produção — o que está como "dev" e não pode ir assim

A boa notícia: **as armadilhas clássicas já têm fail-fast.** O `Program.cs` recusa subir sem JWT
forte (≥32 bytes, `linha 67-71`) e sem Redis em prod (`linha 37`). Segredos **não estão** no
`appsettings.json` versionado (campos vazios, com comentário mandando usar env var). Isso é maduro.

Pontos a tratar:

| Sev | Item | Detalhe / Ação |
|---|---|---|
| 🔴 | **Segredos via env var, não em arquivo** | Em prod, fornecer por variável de ambiente do host: `ConnectionStrings__Default`, `ConnectionStrings__Redis`, `Jwt__SecretKey` (gere 32+ bytes aleatórios), `Cors__Origins`, `AllowedHosts`, e — quando ligar — `SendGrid__ApiKey`, `Sms__Twilio__*`. Ver checklist no fim. |
| 🟠 | **Chave do DemoSeed exposta no repo** | `appsettings.Development.json:26` traz `DemoSeed:Key = "CwOYkerErD_vqhbvNWbrUPkwnkkeB-Ap"` em texto puro. **Mitigação que já existe:** o `DemoSeedController` retorna **404 em produção** (`CheckAccess()` → `IsProduction()`), então a chave é **inofensiva em prod** (endpoint desligado). **Risco residual:** ela está no histórico do git. **Ações:** (1) confirmar que `appsettings.Development.json` está **gitignored** — ⚠️ *verificar* (o comentário diz que sim, mas a chave estar legível levanta dúvida; se estiver versionado, rotacione a chave e remova do tracking); (2) nunca depender dessa chave fora de dev. |
| 🟠 | **Senhas/contas de demonstração hardcoded** | Seed demo `demo@barbersaas.com / demo123456` (`Program.cs:228`) e seed de apresentação `apresentacao@barbersaas.com / Apresenta@2026!` (`DemoSeedController.cs:25-26`). **Ambos só rodam fora de produção** (gated). OK — só garantir que `ASPNETCORE_ENVIRONMENT=Production` no host (senão o seed demo cria conta real com senha pública). |
| 🔴 | **`EnsureCreatedAsync` não vai para produção** | Já coberto em B3/1.2 — é dev-only e incompatível com migrations. Em prod, usar migration. Não "promover" o `EnsureCreated`. |
| 🟠 | **`ASPNETCORE_ENVIRONMENT=Production` obrigatório no host** | É o que desliga Swagger, Hangfire dashboard, seed demo e o endpoint DemoSeed. Se o host subir sem essa env (default vira Production no .NET, mas confirme), tudo "perigoso" fica desligado — **mas** confirme que não está rodando como `Development` por engano. |
| 🟠 | **HTTPS / TLS** | Garantir terminação TLS no host (Vercel já dá no front; no back, o reverse proxy/host precisa). JWT e OTP trafegando em claro = comprometidos. |
| 🟡 | **Rate limit de auth** | Já endurece em prod (5/15min vs 100/1min em dev — `Program.cs:110`). OK. |
| 🟡 | **Backup do banco** | Nenhuma rotina de backup definida. Configurar no SQL Server gerenciado. |

---

## 4. Ordem recomendada (o que destrava o resto)

Sequência pensada para que cada passo desbloqueie o seguinte:

**Fase 0 — Consolidar o que já existe (½ dia)**
1. **Commitar o working tree** (migration de SQL Server, upload de logo, etc.). Nada vai a produção
   enquanto estiver só local. Revisar o diff antes.
2. Confirmar `appsettings.Development.json` gitignored; se não, remover do tracking + rotacionar a
   `DemoSeed:Key`.

**Fase 1 — Infra base (1–2 dias)** *(destrava todo o resto)*
3. Provisionar **SQL Server gerenciado** + **Redis gerenciado** + host do **.NET** (Railway/Azure/Fly).
4. Criar **`Dockerfile`** (multi-stage publish) — ou usar buildpack do host.
5. Definir **migrate em produção**: rodar a migration contra o SQL Server **ou** adicionar
   `db.Database.MigrateAsync()` no boot (fora do bloco dev). Criar **seed de Plans** idempotente p/ prod.
6. Setar **todas as env vars** (checklist abaixo) com `ASPNETCORE_ENVIRONMENT=Production`.
7. Deploy do back, smoke test: `/api/v1/...` responde, app subiu (passou nos fail-fasts).

**Fase 2 — Frontend + conexão (½ dia)**
8. Deploy no Vercel com `VITE_API_URL` apontando para a API. Configurar rewrite SPA.
9. Setar `Cors__Origins` + `AllowedHosts` no back com o domínio do Vercel. Testar login admin ponta a ponta.

**Fase 3 — Ligar serviços externos (1–2 dias)** *(destrava a área do cliente)*
10. **Twilio** (B1) → login OTP do cliente funciona. **Sem isso a área do cliente não existe na prática.**
11. **SendGrid** (I1) + domínio verificado → confirmações/lembretes por email.
12. **Blob storage** (B4) → trocar `UploadsController` de disco para S3/Blob/R2 → logo persiste.

**Fase 4 — Decisão de negócio (variável)**
13. Definir **cobrança/assinatura** (M1): integrar gateway + enforcement de plano, **ou** assumir
    onboarding manual e adiar. Esse é o item de maior incerteza de prazo.

**Fase 5 — Endurecimento (1 dia)**
14. Backups do banco, observabilidade dos jobs (Hangfire com auth), 404/ErrorBoundary (M4), QA E2E
    dos fluxos principais e de erro.

---

## Apêndice — Checklist de variáveis de ambiente (produção)

**Backend (host do .NET):**
```
ASPNETCORE_ENVIRONMENT = Production
ConnectionStrings__Default = Server=...;Database=...;User Id=...;Password=...;Encrypt=True
ConnectionStrings__Redis   = <host>:6379,password=...,ssl=True
Jwt__SecretKey   = <32+ bytes aleatórios>
Jwt__Issuer      = barbersaas.com.br
Jwt__Audience    = barbersaas-clients
Cors__Origins    = https://app.seudominio.com.br
AllowedHosts     = api.seudominio.com.br
SendGrid__ApiKey   = <quando ligar email>        # I1
SendGrid__FromEmail / FromName = ...
Sms__Twilio__AccountSid / AuthToken / FromNumber = <quando ligar SMS>   # B1
```

**Frontend (Vercel — variável de build):**
```
VITE_API_URL = https://api.seudominio.com.br/api/v1
```

---

### Resumo do "tamanho do caminho"

- **Quase pronto:** multi-tenant seguro, migration de SQL Server, upload de logo (tela + entidade),
  fail-fasts de segredo/Redis/JWT, rate limit, CORS por env. *(falta commitar)*
- **Configuração, não código:** host .NET, SQL Server, Redis, env vars, Vercel + CORS, Twilio, SendGrid.
- **Código que falta de fato:** migrate-on-startup (ou rodar migration), seed de Plans p/ prod, blob
  storage no upload, `Dockerfile`/CI.
- **Decisão de produto (pode ser grande):** cobrança/assinatura — hoje **inexistente** e **não forçada**.

> Documento de diagnóstico apenas. Nenhum código foi alterado.
