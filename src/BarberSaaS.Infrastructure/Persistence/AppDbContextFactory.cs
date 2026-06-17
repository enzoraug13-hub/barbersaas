using BarberSaaS.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BarberSaaS.Infrastructure.Persistence;

/// <summary>
/// Usado SOMENTE em design-time pelo <c>dotnet ef</c> para gerar/aplicar migrations.
/// As migrations alvejam o provider de PRODUÇÃO (SQL Server) — migrations do EF são
/// específicas por provider, então o dev (SQLite) continua via EnsureCreated.
/// A connection string vem da env var BARBERSAAS_MIGRATIONS_CONN (não versionar segredos).
///
/// Uso: dotnet ef migrations add InitialCreate -p src/BarberSaaS.Infrastructure -s src/BarberSaaS.API
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connStr = Environment.GetEnvironmentVariable("BARBERSAAS_MIGRATIONS_CONN")
            ?? "Server=localhost,1433;Database=BarberSaaS;User Id=sa;Password=__SET_VIA_ENV__;TrustServerCertificate=True;";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connStr, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
            .Options;

        return new AppDbContext(options, new DesignTimeTenant(), new DesignTimeUser());
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
    }
}
