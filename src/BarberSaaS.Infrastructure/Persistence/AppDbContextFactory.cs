using BarberSaaS.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BarberSaaS.Infrastructure.Persistence;

/// <summary>
/// Usado SOMENTE em design-time pelo <c>dotnet ef</c> para gerar/aplicar migrations.
/// As migrations alvejam o provider de PRODUÇÃO (PostgreSQL/Railway) — migrations do EF são
/// específicas por provider, então o dev (SQLite) continua via EnsureCreated.
/// A connection string vem da env var BARBERSAAS_MIGRATIONS_CONN ou DATABASE_URL
/// (não versionar segredos); o provider é detectado pela connection string, então dá
/// para gerar migrations de SQL Server apontando BARBERSAAS_MIGRATIONS_CONN para ele.
///
/// Uso: dotnet ef migrations add InitialCreate -p src/BarberSaaS.Infrastructure -s src/BarberSaaS.API
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connStr = Environment.GetEnvironmentVariable("BARBERSAAS_MIGRATIONS_CONN")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "Host=localhost;Port=5432;Database=barbersaas;Username=postgres;Password=postgres";
        connStr = ConnectionStringResolver.Normalize(connStr);

        var provider = ConnectionStringResolver.Detect(connStr);

        // Mesmo switch usado em runtime (DependencyInjection) — precisa estar ativo na geração
        // das migrations para DateTime mapear como 'timestamp without time zone'.
        if (provider == DatabaseProvider.PostgreSql)
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var builder = new DbContextOptionsBuilder<AppDbContext>();
        switch (provider)
        {
            case DatabaseProvider.Sqlite:
                builder.UseSqlite(connStr, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                break;
            case DatabaseProvider.PostgreSql:
                builder.UseNpgsql(connStr, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                break;
            default:
                builder.UseSqlServer(connStr, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                break;
        }

        return new AppDbContext(builder.Options, new DesignTimeTenant(), new DesignTimeUser());
    }

    // Stubs: em design-time não há requisição/tenant; o filtro global fica desativado (tenant vazio).
    private sealed class DesignTimeTenant : ICurrentTenant
    {
        public Guid Id => Guid.Empty;
        public string? Slug => null;
        public void SetTenant(Guid tenantId, string? slug = null) { }
    }

    private sealed class DesignTimeUser : ICurrentUser
    {
        public Guid Id => Guid.Empty;
        public string Name => string.Empty;
        public string Email => string.Empty;
        public string Role => string.Empty;
        public Guid? TenantId => null;
        public string? IpAddress => null;
        public bool IsAuthenticated => false;
        public string? Phone => null;
    }
}
