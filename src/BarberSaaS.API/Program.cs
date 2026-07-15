using BarberSaaS.API.Middlewares;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Infrastructure;
using FluentValidation;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// Controllers
builder.Services.AddControllers().AddJsonOptions(opt =>
{
    opt.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    opt.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// Fail-fast: sem Redis em produção, tanto a reserva de slot quanto o desafio
// de OTP (telefone+código antes de existir Client no banco) caem no fallback
// em memória, que não é compartilhado entre instâncias — duas instâncias
// aceitariam reserva do mesmo horário (overbooking) ou perderiam o código OTP
// se o load balancer trocar de instância entre request-otp e verify-otp, sem
// nenhum erro visível. Em dev o fallback em memória é esperado.
if (builder.Environment.IsProduction() && string.IsNullOrEmpty(builder.Configuration.GetConnectionString("Redis")))
    throw new InvalidOperationException(
        "Redis é obrigatório em produção para reserva de slots e OTP — configure ConnectionStrings__Redis.");

// Infrastructure (EF, Repos, Hangfire, Redis, etc.)
builder.Services.AddInfrastructure(builder.Configuration);

// MediatR
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(BarberSaaS.Application.Auth.Commands.LoginCommand).Assembly);
    cfg.AddOpenBehavior(typeof(BarberSaaS.Application.Common.Behaviors.ValidationBehavior<,>));
    // Pronto pra uso, mas nenhum Command/Query implementa IRequireCompleteClientProfile
    // ainda — ver comentário em RequireCompleteClientProfileBehavior.cs.
    cfg.AddOpenBehavior(typeof(BarberSaaS.Application.Common.Behaviors.RequireCompleteClientProfileBehavior<,>));
});

// FluentValidation
builder.Services.AddValidatorsFromAssembly(typeof(BarberSaaS.Application.Auth.Commands.LoginCommandValidator).Assembly);

// HttpContextAccessor
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IDateTimeProvider, DateTimeProvider>();

// JWT Authentication
// Fail-fast: sem uma chave forte, o app NÃO sobe. Antes, uma env var ausente em
// produção fazia o token ser assinado com chave vazia (forjável). HS256 exige
// pelo menos 256 bits (32 bytes). Em dev a chave vem do appsettings.Development.json.
var jwtKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException(
        "Jwt:SecretKey ausente ou fraca (mínimo 32 bytes). Configure via variável de ambiente " +
        "Jwt__SecretKey em produção, ou user-secrets / appsettings.Development.json em desenvolvimento.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        // Mantém os nomes de claim "crus" do token (sub, role, tenant_id, name, email).
        // Sem isso, o ASP.NET remapeia "role" -> ClaimTypes.Role e "sub" -> NameIdentifier,
        // quebrando as authorization policies (RequireClaim("role", ...)) e o CurrentUser.Id.
        opt.MapInboundClaims = false;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer           = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero,
            NameClaimType            = "name",
            RoleClaimType            = "role"
        };
    });

builder.Services.AddAuthorization(opt =>
{
    // As policies de barbearia NÃO incluem "superadmin" de propósito: o super admin
    // não tem tenant (TenantId vazio no JWT), e com tenant vazio o filtro global do
    // EF fica DESLIGADO — se ele alcançasse um endpoint tenant-scoped, leria dados
    // de todas as barbearias misturados e escreveria linhas órfãs. Fica fisicamente
    // fora (403); o mundo dele é /super-admin, que cruza tenants de forma deliberada
    // e controlada (IgnoreQueryFilters + filtros explícitos).
    opt.AddPolicy("RequireOwnerOrAdmin", p => p.RequireClaim("role", "owner", "admin"));
    opt.AddPolicy("RequireBarber",       p => p.RequireClaim("role", "owner", "admin", "barber"));
    opt.AddPolicy("RequireOwner",        p => p.RequireClaim("role", "owner"));
    opt.AddPolicy("RequireSuperAdmin",   p => p.RequireClaim("role", "superadmin"));
    opt.AddPolicy("RequireClient",       p => p.RequireClaim("role", "client"));
    // Exceção única: uploads não são dados tenant-scoped (só storage com prefixo) e
    // o super admin precisa deles pra anexar comprovante de fatura.
    opt.AddPolicy("RequireOwnerOrSuperAdmin", p => p.RequireClaim("role", "owner", "superadmin"));
});

// Rate Limiting
// Em Development o limite de "auth" é bem mais alto: testes manuais repetidos
// (login admin, OTP de cliente, etc.) batiam nos 5/15min pensados para produção.
var isDev = builder.Environment.IsDevelopment();
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = 429;

    // Particionado POR IP do cliente (antes era um balde global único: 5 req/15min
    // valiam para a plataforma inteira — 2 clientes esgotavam o login de todos e
    // qualquer anônimo derrubava a autenticação com 5 requests). Cada IP tem seu
    // próprio balde; um cliente não afeta o outro.
    static string ClientIp(HttpContext ctx)
    {
        // Atrás do proxy (Railway/Vercel) o RemoteIpAddress é o do balanceador —
        // o IP real do cliente vem no X-Forwarded-For (primeiro da lista). Sem isso,
        // todos voltariam a compartilhar um único balde.
        var fwd = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(fwd))
            return fwd.Split(',')[0].Trim();
        return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    opt.AddPolicy("global", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientIp(ctx), _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(1), PermitLimit = 100 }));

    opt.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientIp(ctx), _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(isDev ? 1 : 15), PermitLimit = isDev ? 100 : 5 }));

    opt.AddPolicy("booking", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientIp(ctx), _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(1), PermitLimit = 10 }));

    // Cadastro: mais folgado que "auth" (5) porque um dono legítimo pode errar
    // CPF/CNPJ/senha algumas vezes no formulário — mas ainda barra spam de contas e o
    // abuso da consulta de CNPJ na BrasilAPI, que roda a cada tentativa PJ.
    opt.AddPolicy("register", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientIp(ctx), _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(isDev ? 1 : 15), PermitLimit = isDev ? 100 : 10 }));

    // Refresh: o SPA renova sozinho quando o access token expira, e vários aparelhos da
    // mesma barbearia (NAT) compartilham IP — precisa de folga acima do "auth" pra não
    // derrubar sessões legítimas, mas limita martelamento anônimo do endpoint.
    opt.AddPolicy("refresh", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientIp(ctx), _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(isDev ? 1 : 15), PermitLimit = isDev ? 100 : 20 }));
});

// CORS
builder.Services.AddCors(opt => opt.AddPolicy("frontend", p =>
    p.WithOrigins(builder.Configuration["Cors:Origins"]?.Split(",") ?? new[] { "http://localhost:5173" })
     .AllowAnyMethod()
     .AllowAnyHeader()
     .AllowCredentials()));

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "BarberSaaS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type   = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>()
    });
});

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseRateLimiter();
app.UseCors("frontend");
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>();
app.UseAuthorization();

// Hangfire Dashboard: somente em Development. O dashboard não tem autenticação,
// então não pode ficar exposto em staging/produção. Para habilitar fora de dev,
// adicionar um IDashboardAuthorizationFilter antes.
if (app.Environment.IsDevelopment())
    app.UseHangfireDashboard("/hangfire");

// Hangfire recurring jobs (usa IRecurringJobManager para compatibilidade com InMemory storage)
var recurringJobs = app.Services.GetRequiredService<IRecurringJobManager>();
recurringJobs.AddOrUpdate<BarberSaaS.Infrastructure.BackgroundJobs.ReminderJob>(
    "reminders-24h",
    job => job.ScheduleReminders24hAsync(),
    Cron.Hourly());

app.MapControllers();
// Imagens de upload são públicas e, em produção, consumidas de outra origem
// (frontend no Vercel) — sem o header CORS o fetch() delas (ex.: logo nos PDFs)
// falha; tags <img> não precisam, mas o header não atrapalha.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.Context.Request.Path.StartsWithSegments("/uploads"))
        {
            ctx.Context.Response.Headers.AccessControlAllowOrigin = "*";
            // Impede o navegador de "farejar" outro MIME e executar um upload malicioso
            // como HTML/JS — o Content-Type declarado aqui é a palavra final.
            ctx.Context.Response.Headers.XContentTypeOptions = "nosniff";
        }
    }
});

// Inicialização do banco no boot:
// - Development: EnsureCreated (SQLite) + seed completo (planos + tenant/usuário demo).
// - Produção/Staging: migrate-on-startup (cria/atualiza schema do SQL Server) + seed idempotente
//   apenas dos planos. Detalhes e o porquê de cada ambiente usar exatamente um: DbInitializer.
await BarberSaaS.API.DbInitializer.InitializeAsync(app);

app.Run();

// Helper implementations
public class DateTimeProvider : BarberSaaS.Application.Common.Interfaces.IDateTimeProvider
{
    public DateTime UtcNow   => DateTime.UtcNow;
    public DateOnly TodayUtc => DateOnly.FromDateTime(DateTime.UtcNow);
}
