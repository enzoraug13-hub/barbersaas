using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace BarberSaaS.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly ICurrentTenant _currentTenant;
    private readonly ICurrentUser _currentUser;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ICurrentTenant currentTenant,
        ICurrentUser currentUser) : base(options)
    {
        _currentTenant = currentTenant;
        _currentUser   = currentUser;
    }

    public DbSet<Tenant>              Tenants              => Set<Tenant>();
    public DbSet<TenantSettings>      TenantSettings       => Set<TenantSettings>();
    public DbSet<User>                Users                => Set<User>();
    public DbSet<RefreshToken>        RefreshTokens        => Set<RefreshToken>();
    public DbSet<Barber>              Barbers              => Set<Barber>();
    public DbSet<Client>              Clients              => Set<Client>();
    public DbSet<Service>             Services             => Set<Service>();
    public DbSet<BarberService>       BarberServices       => Set<BarberService>();
    public DbSet<Appointment>         Appointments         => Set<Appointment>();
    public DbSet<WorkSchedule>        WorkSchedules        => Set<WorkSchedule>();
    public DbSet<WorkShift>           WorkShifts           => Set<WorkShift>();
    public DbSet<ShiftBreak>          ShiftBreaks          => Set<ShiftBreak>();
    public DbSet<DayOff>              DaysOff              => Set<DayOff>();
    public DbSet<FinancialTransaction> FinancialTransactions => Set<FinancialTransaction>();
    public DbSet<FinancialPayment>    FinancialPayments    => Set<FinancialPayment>();
    public DbSet<Goal>                Goals                => Set<Goal>();
    public DbSet<GoalContribution>    GoalContributions    => Set<GoalContribution>();
    public DbSet<Plan>                Plans                => Set<Plan>();
    public DbSet<Subscription>        Subscriptions        => Set<Subscription>();
    public DbSet<SubscriptionPayment> SubscriptionPayments => Set<SubscriptionPayment>();
    public DbSet<Product>             Products             => Set<Product>();
    public DbSet<ProductCategory>     ProductCategories    => Set<ProductCategory>();
    public DbSet<StockMovement>       StockMovements       => Set<StockMovement>();
    public DbSet<ProductSale>         ProductSales         => Set<ProductSale>();
    public DbSet<ProductSaleItem>     ProductSaleItems     => Set<ProductSaleItem>();
    public DbSet<LoyaltyProgram>      LoyaltyPrograms      => Set<LoyaltyProgram>();
    public DbSet<LoyaltyWallet>       LoyaltyWallets       => Set<LoyaltyWallet>();
    public DbSet<LoyaltyTransaction>  LoyaltyTransactions  => Set<LoyaltyTransaction>();
    public DbSet<Coupon>              Coupons              => Set<Coupon>();
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<NotificationQueue>   NotificationQueue    => Set<NotificationQueue>();
    public DbSet<AuditLog>            AuditLogs            => Set<AuditLog>();

    // Lido pelo EF a CADA query (referência de instância do contexto), garantindo
    // que o filtro multi-tenant use o tenant da requisição atual e não um valor
    // "congelado" no momento em que o modelo foi construído/cacheado.
    public Guid CurrentTenantId => _currentTenant.Id;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Global Query Filters: soft-delete + tenant isolation
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(AppDbContext)
                    .GetMethod(nameof(ApplyGlobalFilters), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { modelBuilder });
            }
        }

        // Many-to-many composite key
        modelBuilder.Entity<BarberService>()
            .HasKey(bs => new { bs.BarberId, bs.ServiceId });

        base.OnModelCreating(modelBuilder);
    }

    private void ApplyGlobalFilters<T>(ModelBuilder builder) where T : BaseEntity
    {
        // O Tenant é a RAIZ da hierarquia multi-tenant — o TenantId dele é vazio,
        // então não pode ser filtrado por tenant (senão a própria linha some).
        // Aplica-se apenas o soft-delete. As consultas de Tenant já são por Id/Slug.
        if (typeof(T) == typeof(Tenant))
        {
            builder.Entity<T>().HasQueryFilter(e => !e.IsDeleted);
            return;
        }

        // Demais entidades: soft-delete + isolamento por tenant.
        // Referencia a propriedade de instância CurrentTenantId (this.CurrentTenantId):
        // o EF Core reavalia esse valor a cada execução de query, no contexto da
        // requisição corrente. Tenant vazio (seed/fluxo público) desativa o filtro.
        builder.Entity<T>().HasQueryFilter(e =>
            !e.IsDeleted &&
            (CurrentTenantId == Guid.Empty || e.TenantId == CurrentTenantId));
    }

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.TenantId == Guid.Empty && _currentTenant.Id != Guid.Empty)
                    entry.Entity.TenantId = _currentTenant.Id;
            }
            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return await base.SaveChangesAsync(ct);
    }
}
