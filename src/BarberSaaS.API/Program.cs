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

// Infrastructure (EF, Repos, Hangfire, Redis, etc.)
builder.Services.AddInfrastructure(builder.Configuration);

// MediatR
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(BarberSaaS.Application.Auth.Commands.LoginCommand).Assembly);
    cfg.AddOpenBehavior(typeof(BarberSaaS.Application.Common.Behaviors.ValidationBehavior<,>));
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
    opt.AddPolicy("RequireOwnerOrAdmin", p => p.RequireClaim("role", "owner", "admin", "superadmin"));
    opt.AddPolicy("RequireBarber",       p => p.RequireClaim("role", "owner", "admin", "barber", "superadmin"));
    opt.AddPolicy("RequireOwner",        p => p.RequireClaim("role", "owner", "superadmin"));
    opt.AddPolicy("RequireSuperAdmin",   p => p.RequireClaim("role", "superadmin"));
    opt.AddPolicy("RequireClient",       p => p.RequireClaim("role", "client"));
});

// Rate Limiting
builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("global", o => { o.Window = TimeSpan.FromMinutes(1); o.PermitLimit = 100; });
    opt.AddFixedWindowLimiter("auth",   o => { o.Window = TimeSpan.FromMinutes(15); o.PermitLimit = 5; });
    opt.AddFixedWindowLimiter("booking",o => { o.Window = TimeSpan.FromMinutes(1); o.PermitLimit = 10; });
    opt.RejectionStatusCode = 429;
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

// Hangfire Dashboard (apenas dev/staging)
if (!app.Environment.IsProduction())
    app.UseHangfireDashboard("/hangfire");

// Hangfire recurring jobs (usa IRecurringJobManager para compatibilidade com InMemory storage)
var recurringJobs = app.Services.GetRequiredService<IRecurringJobManager>();
recurringJobs.AddOrUpdate<BarberSaaS.Infrastructure.BackgroundJobs.ReminderJob>(
    "reminders-24h",
    job => job.ScheduleReminders24hAsync(),
    Cron.Hourly());

app.MapControllers();
app.UseStaticFiles();

// Seed inicial (somente em desenvolvimento)
if (app.Environment.IsDevelopment())
    await SeedAsync(app.Services);

app.Run();

static async Task SeedAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db     = scope.ServiceProvider.GetRequiredService<BarberSaaS.Infrastructure.Persistence.AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<BarberSaaS.Application.Common.Interfaces.IPasswordHasher>();

    await db.Database.EnsureCreatedAsync();

    if (!db.Plans.Any())
    {
        db.Plans.AddRange(
            new BarberSaaS.Domain.Entities.Plan { Name = "Gratuito",     Slug = "gratuito",     MonthlyPrice = 0,   MaxBarbers = 1, MaxAppointmentsPerMonth = 50,  Features = "{\"onlineBooking\":true,\"googleCalendar\":false,\"financialControl\":false}" },
            new BarberSaaS.Domain.Entities.Plan { Name = "Profissional", Slug = "profissional", MonthlyPrice = 97,  MaxBarbers = 5, Features = "{\"onlineBooking\":true,\"googleCalendar\":true,\"financialControl\":true}", DisplayOrder = 1 },
            new BarberSaaS.Domain.Entities.Plan { Name = "Premium",      Slug = "premium",      MonthlyPrice = 197, MaxBarbers = 0, Features = "{\"onlineBooking\":true,\"googleCalendar\":true,\"financialControl\":true,\"loyalty\":true,\"aiInsights\":true}", DisplayOrder = 2 }
        );
        await db.SaveChangesAsync();
    }

    // Conta demo para desenvolvimento
    if (!db.Tenants.Any())
    {
        var freePlan = db.Plans.First(p => p.Slug == "gratuito");
        var tenant   = new BarberSaaS.Domain.Entities.Tenant { Name = "Barbearia Demo", Slug = "demo" };
        var settings = new BarberSaaS.Domain.Entities.TenantSettings
        {
            TenantId     = tenant.Id,
            BusinessName = "Barbearia Demo",
            Phone        = "+5511999999999",
            PublicSlug   = "demo",
            PrimaryColor   = "#1a1a1a",
            SecondaryColor = "#eab308",
            AccentColor    = "#ffffff",
            AllowOnlineBooking = true
        };
        tenant.Settings = settings;
        tenant.Subscription = new BarberSaaS.Domain.Entities.Subscription
        {
            TenantId           = tenant.Id,
            PlanId             = freePlan.Id,
            Status             = BarberSaaS.Domain.Enums.SubscriptionStatus.Trial,
            CurrentPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
            CurrentPeriodEnd   = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            TrialEndsAt        = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30))
        };

        var owner = new BarberSaaS.Domain.Entities.User
        {
            TenantId     = tenant.Id,
            Name         = "Admin Demo",
            Email        = "demo@barbersaas.com",
            PasswordHash = hasher.Hash("demo123456"),
            Role         = BarberSaaS.Domain.Enums.UserRole.Owner,
            IsActive     = true,
            EmailVerified = true
        };

        db.Tenants.Add(tenant);
        db.Users.Add(owner);
        await db.SaveChangesAsync();
    }
}

// Helper implementations
public class DateTimeProvider : BarberSaaS.Application.Common.Interfaces.IDateTimeProvider
{
    public DateTime UtcNow   => DateTime.UtcNow;
    public DateOnly TodayUtc => DateOnly.FromDateTime(DateTime.UtcNow);
}
