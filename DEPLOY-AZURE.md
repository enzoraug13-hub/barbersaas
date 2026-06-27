# Deploy em Produção — Azure (API) + Vercel (Frontend)

Guia copiável para o deploy. Backend .NET 9 em **Azure App Service (container)** + **Azure SQL** +
**Azure Cache for Redis**; frontend React no **Vercel**. Baseado no diagnóstico do
`ROADMAP-PRODUCAO.md` (env vars, bloqueadores, migrate-on-startup, Redis obrigatório).

> Convenção: tudo entre `< >` é placeholder — troque pelo seu valor. Os comandos assumem **bash**
> (Azure Cloud Shell ou Git Bash). No PowerShell, troque `$VAR` por `$env:VAR` e os `\` de quebra de
> linha por crase `` ` ``.

---

## 0. Pré-requisitos

```bash
# Instalar Azure CLI (se ainda não tiver): https://aka.ms/InstallAzureCLI
az version
az login                       # abre o navegador
az account show                # confirma a assinatura certa
az account set --subscription "<SUB_ID_OU_NOME>"
```

Defina as variáveis da sessão (edite os valores) — o resto do guia as reutiliza:

```bash
RG=barbersaas-rg
LOCATION=brazilsouth                 # região mais próxima do Brasil
SQL_SERVER=<SQL_SERVER_NAME>         # único GLOBAL (ex.: barbersaas-sql-001)
SQL_DB=barbersaas
SQL_ADMIN=<SQL_ADMIN_USER>           # ex.: bsadmin (NÃO use 'admin'/'sa')
SQL_PASSWORD='<SQL_PASSWORD>'        # forte: 12+ chars, maiúscula/minúscula/número/símbolo
REDIS=<REDIS_NAME>                   # único GLOBAL (ex.: barbersaas-redis-001)
ACR=<ACR_NAME>                       # único GLOBAL, só letras/números (ex.: barbersaasacr)
APP=<APP_NAME>                       # único GLOBAL -> vira https://<APP>.azurewebsites.net
PLAN=barbersaas-plan
```

---

## 1. Resource Group

```bash
az group create -n $RG -l $LOCATION
```

## 2. Azure SQL Database (Basic)

```bash
# Servidor lógico
az sql server create -n $SQL_SERVER -g $RG -l $LOCATION -u $SQL_ADMIN -p "$SQL_PASSWORD"

# Banco (Basic = ~5 DTU, suficiente para começar)
az sql db create -g $RG -s $SQL_SERVER -n $SQL_DB \
  --service-objective Basic --backup-storage-redundancy Local

# Firewall: permitir serviços internos do Azure (o App Service usa IP variável).
# A regra 0.0.0.0–0.0.0.0 é o atalho oficial do Azure para "Allow Azure services".
az sql server firewall-rule create -g $RG -s $SQL_SERVER \
  -n AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# (Opcional) liberar SEU IP para rodar a migration manual da Seção 7 (plano B):
az sql server firewall-rule create -g $RG -s $SQL_SERVER \
  -n MeuIP --start-ip-address <SEU_IP> --end-ip-address <SEU_IP>
```

## 3. Azure Cache for Redis (Basic C0) — **obrigatório**

> Sem `ConnectionStrings__Redis` o app **não sobe** (fail-fast no `Program.cs`). Redis sustenta a
> reserva de slot (anti-overbooking) e o OTP do login do cliente.

```bash
az redis create -n $REDIS -g $RG -l $LOCATION --sku Basic --vm-size c0 --minimum-tls-version 1.2

# Pegue a chave primária (vai na connection string com SSL, porta 6380):
REDIS_KEY=$(az redis list-keys -n $REDIS -g $RG --query primaryKey -o tsv)
echo "Redis connection string:"
echo "$REDIS.redis.cache.windows.net:6380,password=$REDIS_KEY,ssl=True,abortConnect=False"
```

## 4. Azure Container Registry (ACR)

```bash
az acr create -n $ACR -g $RG --sku Basic --admin-enabled true
```

## 5. App Service (Plan B1, Linux, container)

```bash
az appservice plan create -g $RG -n $PLAN --is-linux --sku B1

# Cria o Web App já apontando para a imagem (ainda não existe no ACR — o 1º push do
# CI/CD da Seção 8, ou um build/push manual, preenche).
az webapp create -g $RG -p $PLAN -n $APP \
  --deployment-container-image-name $ACR.azurecr.io/barbersaas-api:latest

# Credenciais do ACR no Web App (admin creds; alternativa madura = managed identity)
ACR_USER=$(az acr credential show -n $ACR --query username -o tsv)
ACR_PASS=$(az acr credential show -n $ACR --query 'passwords[0].value' -o tsv)
az webapp config container set -g $RG -n $APP \
  --docker-custom-image-name $ACR.azurecr.io/barbersaas-api:latest \
  --docker-registry-server-url https://$ACR.azurecr.io \
  --docker-registry-server-user "$ACR_USER" \
  --docker-registry-server-password "$ACR_PASS"

# A imagem expõe a porta 8080 — diga isso ao App Service:
az webapp config appsettings set -g $RG -n $APP --settings WEBSITES_PORT=8080
```

## 6. Variáveis de ambiente do App Service

Gere primeiro uma chave JWT forte (≥32 bytes — o app recusa subir com chave fraca):

```bash
# bash:
JWT_KEY=$(openssl rand -base64 48)
echo "$JWT_KEY"
# PowerShell (alternativa):
#   [Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))
```

Setar tudo de uma vez (App Settings usam `__` como separador de seção):

```bash
az webapp config appsettings set -g $RG -n $APP --settings \
  ASPNETCORE_ENVIRONMENT=Production \
  WEBSITES_PORT=8080 \
  "ConnectionStrings__Default=Server=tcp:$SQL_SERVER.database.windows.net,1433;Initial Catalog=$SQL_DB;User ID=$SQL_ADMIN;Password=$SQL_PASSWORD;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;" \
  "ConnectionStrings__Redis=$REDIS.redis.cache.windows.net:6380,password=$REDIS_KEY,ssl=True,abortConnect=False" \
  "Jwt__SecretKey=$JWT_KEY" \
  Jwt__Issuer=barbersaas.com.br \
  Jwt__Audience=barbersaas-clients \
  "AllowedHosts=$APP.azurewebsites.net" \
  "Cors__Origins=https://PLACEHOLDER.vercel.app"
```

> `Cors__Origins` fica como placeholder agora; você volta e ajusta na **Seção 9** com a URL real do
> Vercel. **Sem barra final, com `https://`** (há `AllowCredentials()`, então `*` não é permitido).

### Tabela de referência das variáveis

| Variável | Valor / formato | Obrigatória | Origem |
|---|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | ✅ | desliga Swagger/Hangfire dashboard/seed demo/DemoSeed |
| `WEBSITES_PORT` | `8080` | ✅ | porta exposta pela imagem |
| `ConnectionStrings__Default` | `Server=tcp:<srv>.database.windows.net,1433;Initial Catalog=<db>;User ID=<u>;Password=<p>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;` | ✅ | Azure SQL (Seção 2) |
| `ConnectionStrings__Redis` | `<redis>.redis.cache.windows.net:6380,password=<key>,ssl=True,abortConnect=False` | ✅ | Redis (Seção 3) |
| `Jwt__SecretKey` | ≥32 bytes aleatórios | ✅ | gerado acima |
| `Jwt__Issuer` | `barbersaas.com.br` | ✅ | — |
| `Jwt__Audience` | `barbersaas-clients` | ✅ | — |
| `AllowedHosts` | `<APP>.azurewebsites.net` | ✅ | domínio da API |
| `Cors__Origins` | `https://<projeto>.vercel.app` | ✅ | URL do front (Seção 9) |
| `SendGrid__ApiKey` / `SendGrid__FromEmail` / `SendGrid__FromName` | — | ⏳ ligar depois | email (I1) |
| `Sms__Twilio__AccountSid` / `AuthToken` / `FromNumber` | — | ⏳ ligar depois | SMS/OTP (B1) |

## 7. Como a migration roda

**Automático (migrate-on-startup — implementado na preparação do deploy):** quando o container sobe
com `ASPNETCORE_ENVIRONMENT=Production`, o `DbInitializer` chama `db.Database.MigrateAsync()` e
**cria/atualiza o schema sozinho** no Azure SQL, depois semeia os Plans (idempotente). Se a connection
string estiver errada ou o firewall fechado, ele loga `CRITICAL` com a causa e **o container não sobe**
(falha visível, não silenciosa).

**Plano B (rodar a migration manualmente da sua máquina):** o projeto tem um `AppDbContextFactory` que
lê a env var `BARBERSAAS_MIGRATIONS_CONN`.

```bash
# bash
export BARBERSAAS_MIGRATIONS_CONN="Server=tcp:$SQL_SERVER.database.windows.net,1433;Initial Catalog=$SQL_DB;User ID=$SQL_ADMIN;Password=$SQL_PASSWORD;Encrypt=True;Connection Timeout=60;"
dotnet ef database update -p src/BarberSaaS.Infrastructure -s src/BarberSaaS.API
```
```powershell
# PowerShell
$env:BARBERSAAS_MIGRATIONS_CONN="Server=tcp:<SQL_SERVER_NAME>.database.windows.net,1433;Initial Catalog=barbersaas;User ID=<SQL_ADMIN_USER>;Password=<SQL_PASSWORD>;Encrypt=True;Connection Timeout=60;"
dotnet ef database update -p src/BarberSaaS.Infrastructure -s src/BarberSaaS.API
```
(Precisa do seu IP liberado no firewall do SQL — regra `MeuIP` da Seção 2.)

## 8. CI/CD — primeiro deploy da imagem

O workflow `.github/workflows/azure-deploy.yml` builda e dá push no ACR + deploy no App Service a cada
push na `main`. Antes do primeiro run:

```bash
# Service principal para o GitHub Actions:
az ad sp create-for-rbac --name barbersaas-ci --role contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/$RG --sdk-auth
```
- Copie o **JSON inteiro** da saída para o GitHub: *Settings → Secrets and variables → Actions → New
  repository secret* → nome **`AZURE_CREDENTIALS`**.
- Edite os placeholders `ACR_NAME` e `AZURE_WEBAPP_NAME` no topo do workflow (`env:`).
- Faça push na `main` (ou rode "Run workflow" manualmente). O App Service reinicia com a imagem nova e a
  migration aplica no boot.

> Build manual (sem CI), se preferir o 1º deploy na mão:
> ```bash
> az acr login -n $ACR
> docker build -t $ACR.azurecr.io/barbersaas-api:latest .
> docker push $ACR.azurecr.io/barbersaas-api:latest
> az webapp restart -g $RG -n $APP
> ```

## 9. Frontend no Vercel

1. Vercel → **Add New Project** → importe o repo do GitHub.
2. **Root Directory:** `frontend/barbersaas-web` (importante — o `vercel.json` e o build estão lá).
3. Framework: **Vite** (autodetect). Build: `npm run build`. Output: `dist`.
4. **Environment Variables** → adicione:
   ```
   VITE_API_URL = https://<APP>.azurewebsites.net/api/v1
   ```
   (variável de **build**; veja `.env.production.example`.)
5. **Deploy.** Anote a URL final (ex.: `https://barbersaas.vercel.app`).

O `vercel.json` já faz o rewrite de SPA (toda rota → `index.html`, resolve o 404 no F5) e seta os
headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

## 10. Voltar no Azure e fechar o CORS

```bash
az webapp config appsettings set -g $RG -n $APP --settings \
  "Cors__Origins=https://<sua-url-do-vercel>"     # sem barra final
az webapp restart -g $RG -n $APP
```

---

## 11. Smoke test (checklist pós-deploy)

- [ ] **API sobe** (passou nos fail-fasts): `https://<APP>.azurewebsites.net/swagger` responde? *(Em
      Production o Swagger fica OFF — use o `GET` público abaixo para confirmar que subiu.)*
- [ ] `GET https://<APP>.azurewebsites.net/api/v1/public/demo` → 404 “tenant não encontrado” é OK
      (significa que a API e o banco respondem); erro 500/timeout = banco/migration.
- [ ] **Login admin** funciona no front do Vercel (sem erro de CORS no console do navegador).
- [ ] **Criar barbearia** (registro) — depende dos **Plans semeados** (confira que apareceram).
- [ ] **Agendamento do cliente ponta a ponta** — exige **Twilio** ligado (senão o OTP não chega; ver
      Pendências). Sem Twilio, valide pelo painel admin criando um agendamento manual.
- [ ] **Upload de logo** (aba Identidade/Fotos) salva e exibe — lembrando que em disco é **efêmero**
      (some no próximo deploy) até migrar para blob (B4).

---

## 12. Custo mensal estimado

Tiers desta receita, **Brazil South**, aproximado (preços Azure mudam — confirme no
[Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)). Câmbio ~R$ 5,40.

| Recurso | Tier | USD/mês | BRL/mês (~) |
|---|---|---|---|
| App Service Plan | B1 (Linux) | ~$13 | ~R$ 70 |
| Azure SQL Database | Basic (5 DTU) | ~$5 | ~R$ 27 |
| Azure Cache for Redis | Basic C0 | ~$16 | ~R$ 86 |
| Azure Container Registry | Basic | ~$5 | ~R$ 27 |
| **Total** | | **~$39** | **~R$ 210** |

> Vercel: o plano **Hobby (grátis)** cobre o frontend. Twilio/SendGrid têm custo por uso (à parte),
> só quando ligados.

---

## 13. Pendências pós-deploy (o que ainda falta para 100%)

Referência completa no `ROADMAP-PRODUCAO.md`:

- **B1 — Twilio (SMS/OTP):** sem `Sms__Twilio__*`, o login do cliente por código **não funciona** (o
  cliente não recebe o SMS). É o bloqueador nº 1 da **área do cliente**. Precisa de conta Twilio +
  número + as 3 env vars.
- **I1 — SendGrid (email):** confirmações/lembretes por email não saem sem `SendGrid__ApiKey` +
  domínio remetente verificado (SPF/DKIM).
- **B4 — Blob storage para uploads:** o upload de logo/capa grava em disco local **efêmero** (some no
  redeploy, não é compartilhado entre instâncias). Trocar o `UploadsController` por Azure Blob/S3/R2
  mantendo o contrato `POST /uploads → { url }`.
- **M1 — Cobrança/assinatura:** não existe gateway nem enforcement de plano. Decisão de negócio —
  dá para lançar com onboarding manual e cobrar por fora.
- **Observabilidade:** dashboard do Hangfire fica OFF em produção (sem auth). Adicionar um
  `IDashboardAuthorizationFilter` se quiser visibilidade dos jobs.
- **Backup do banco:** configurar retenção/backups no Azure SQL.
