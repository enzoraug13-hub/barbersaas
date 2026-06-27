using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.API;

/// <summary>
/// Inicialização do banco no boot.
/// <para>
/// - <b>Development</b>: cria o schema do SQLite via <c>EnsureCreated</c> + seed completo
///   (planos + tenant/usuário demo).
/// </para>
/// <para>
/// - <b>Produção/Staging</b>: aplica as migrations (cria/atualiza o schema do SQL Server) +
///   seed idempotente APENAS dos planos (sem tenant demo, sem usuários de teste).
/// </para>
/// <c>EnsureCreated</c> e <c>Migrate</c> são mutuamente incompatíveis (o <c>EnsureCreated</c>
/// não registra em <c>__EFMigrationsHistory</c>, e aí o <c>Migrate</c> se recusa a aplicar) —
/// por isso cada ambiente usa exatamente um.
/// </summary>
public static class DbInitializer
{
    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var sp     = scope.ServiceProvider;
        var db     = sp.GetRequiredService<AppDbContext>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");

        if (app.Environment.IsDevelopment())
        {
            // Dev: SQLite criado na hora, com dados de demonstração.
            await db.Database.EnsureCreatedAsync();
            await SeedPlansAsync(db, logger);
            await SeedDemoTenantAsync(sp);
            return;
        }

        // Produção/Staging: migrate-on-startup. Uma falha aqui (connection string errada, banco
        // inacessível, firewall do Azure SQL fechado) deve ser ALTA e VISÍVEL — é melhor o container
        // não subir do que rodar sem schema e quebrar silenciosamente na primeira request.
        try
        {
            logger.LogInformation("Banco: aplicando migrations pendentes...");
            await db.Database.MigrateAsync();
            logger.LogInformation("Banco: migrations aplicadas com sucesso.");
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex,
                "Banco: FALHA ao aplicar migrations no startup. Verifique ConnectionStrings__Default " +
                "(servidor acessível, credenciais corretas, firewall do Azure SQL liberando 'Allow Azure services'). " +
                "A aplicação não vai subir até o banco estar acessível.");
            throw; // fail-fast visível
        }

        await SeedPlansAsync(db, logger);
    }

    // Idempotente: insere os 3 planos só quando a tabela ainda está vazia. Rodar duas vezes não
    // duplica. Usado em dev e em produção (a tela de cadastro/assinatura depende dos planos existirem).
    private static async Task SeedPlansAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Plans.AnyAsync()) return;

        db.Plans.AddRange(
            new Plan { Name = "Gratuito",     Slug = "gratuito",     MonthlyPrice = 0,   MaxBarbers = 1, MaxAppointmentsPerMonth = 50,  Features = "{\"onlineBooking\":true,\"googleCalendar\":false,\"financialControl\":false}" },
            new Plan { Name = "Profissional", Slug = "profissional", MonthlyPrice = 97,  MaxBarbers = 5, Features = "{\"onlineBooking\":true,\"googleCalendar\":true,\"financialControl\":true}", DisplayOrder = 1 },
            new Plan { Name = "Premium",      Slug = "premium",      MonthlyPrice = 197, MaxBarbers = 0, Features = "{\"onlineBooking\":true,\"googleCalendar\":true,\"financialControl\":true,\"loyalty\":true,\"aiInsights\":true}", DisplayOrder = 2 }
        );
        await db.SaveChangesAsync();
        logger.LogInformation("Banco: planos semeados (Gratuito/Profissional/Premium).");
    }

    // Tenant + usuário de demonstração — SOMENTE desenvolvimento. NUNCA chamado em produção
    // (a conta demo@barbersaas.com / demo123456 é pública e não pode existir num banco real).
    private static async Task SeedDemoTenantAsync(IServiceProvider sp)
    {
        var db     = sp.GetRequiredService<AppDbContext>();
        var hasher = sp.GetRequiredService<IPasswordHasher>();

        if (await db.Tenants.AnyAsync()) return;

        var freePlan = db.Plans.First(p => p.Slug == "gratuito");
        var tenant   = new Tenant { Name = "Barbearia Demo", Slug = "demo" };
        var settings = new TenantSettings
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
        tenant.Subscription = new Subscription
        {
            TenantId           = tenant.Id,
            PlanId             = freePlan.Id,
            Status             = SubscriptionStatus.Trial,
            CurrentPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
            CurrentPeriodEnd   = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            TrialEndsAt        = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30))
        };

        var owner = new User
        {
            TenantId     = tenant.Id,
            Name         = "Admin Demo",
            Email        = "demo@barbersaas.com",
            PasswordHash = hasher.Hash("demo123456"),
            Role         = UserRole.Owner,
            IsActive     = true,
            EmailVerified = true
        };

        db.Tenants.Add(tenant);
        db.Users.Add(owner);
        await db.SaveChangesAsync();
    }
}
