using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext db) : base(db) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().AnyAsync(u => u.Email == email && !u.IsDeleted, ct);
}

public class TenantRepository : BaseRepository<Tenant>, ITenantRepository
{
    public TenantRepository(AppDbContext db) : base(db) { }

    public async Task<Tenant?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters()
            .Include(t => t.Settings)
            .FirstOrDefaultAsync(t => t.Slug == slug && !t.IsDeleted, ct);

    public async Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().AnyAsync(t => t.Slug == slug, ct);

    public async Task<Tenant?> GetWithSettingsAsync(Guid id, CancellationToken ct = default)
        => await _set.Include(t => t.Settings).FirstOrDefaultAsync(t => t.Id == id, ct);
}

public class BarberRepository : BaseRepository<Barber>, IBarberRepository
{
    public BarberRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<Barber>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(b => b.TenantId == tenantId && b.IsActive).OrderBy(b => b.DisplayOrder).ToListAsync(ct);

    public async Task<Barber?> GetWithScheduleAsync(Guid id, CancellationToken ct = default)
        => await _set.Include(b => b.WorkSchedules).ThenInclude(ws => ws.WorkShifts).ThenInclude(s => s.Breaks)
            .FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<IReadOnlyList<Barber>> GetShowInPublicPageAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(b => b.TenantId == tenantId && b.IsActive && b.ShowInPublicPage)
            .OrderBy(b => b.DisplayOrder).ToListAsync(ct);
}

public class ClientRepository : BaseRepository<Client>, IClientRepository
{
    public ClientRepository(AppDbContext db) : base(db) { }

    public async Task<Client?> GetByPhoneAsync(string phone, Guid tenantId, CancellationToken ct = default)
        => await _set.FirstOrDefaultAsync(c => c.PhoneNumber == phone && c.TenantId == tenantId, ct);

    public async Task<bool> PhoneExistsAsync(string phone, Guid tenantId, CancellationToken ct = default)
        => await _set.AnyAsync(c => c.PhoneNumber == phone && c.TenantId == tenantId, ct);
}

public class ServiceRepository : BaseRepository<Service>, IServiceRepository
{
    public ServiceRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<Service>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(s => s.TenantId == tenantId && s.IsActive).OrderBy(s => s.DisplayOrder).ToListAsync(ct);

    public async Task<IReadOnlyList<Service>> GetPublicByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(s => s.TenantId == tenantId && s.IsActive && s.ShowInPublicPage)
            .OrderBy(s => s.DisplayOrder).ToListAsync(ct);
}

public class FinancialRepository : BaseRepository<FinancialTransaction>, IFinancialRepository
{
    public FinancialRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<FinancialTransaction>> GetByPeriodAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(t => t.TenantId == tenantId && t.TransactionDate >= start && t.TransactionDate <= end)
            .OrderByDescending(t => t.TransactionDate).ToListAsync(ct);

    public async Task<decimal> GetTotalRevenueAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default)
        => await _set.Where(t => t.TenantId == tenantId && t.Type == TransactionType.Revenue && t.TransactionDate >= start && t.TransactionDate <= end)
            .SumAsync(t => t.Amount, ct);

    public async Task<decimal> GetTotalExpenseAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default)
        => await _set.Where(t => t.TenantId == tenantId && t.Type == TransactionType.Expense && t.TransactionDate >= start && t.TransactionDate <= end)
            .SumAsync(t => t.Amount, ct);
}

public class GoalRepository : BaseRepository<Goal>, IGoalRepository
{
    public GoalRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<Goal>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Include(g => g.Contributions)
            .Where(g => g.TenantId == tenantId && g.Status == GoalStatus.Active)
            .ToListAsync(ct);
}

public class ProductRepository : BaseRepository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<Product>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Include(p => p.Category).Where(p => p.TenantId == tenantId && p.IsActive).ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> GetLowStockAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(p => p.TenantId == tenantId && p.IsActive && p.StockQuantity <= p.MinStockAlert).ToListAsync(ct);
}

public class NotificationRepository : BaseRepository<NotificationQueue>, INotificationRepository
{
    public NotificationRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<NotificationQueue>> GetPendingAsync(int limit = 50, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters()
            .Where(n => n.Status == NotificationStatus.Pending && n.ScheduledAt <= DateTime.UtcNow)
            .OrderBy(n => n.ScheduledAt)
            .Take(limit)
            .ToListAsync(ct);
}

public class PlanRepository : BaseRepository<Plan>, IPlanRepository
{
    public PlanRepository(AppDbContext db) : base(db) { }

    public async Task<Plan?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Slug == slug && !p.IsDeleted, ct);

    public async Task<IReadOnlyList<Plan>> GetPublicPlansAsync(CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().Where(p => p.IsPublic && p.IsActive && !p.IsDeleted)
            .OrderBy(p => p.DisplayOrder).ToListAsync(ct);
}

public class RefreshTokenRepository : BaseRepository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(AppDbContext db) : base(db) { }

    public async Task<RefreshToken?> GetByHashAsync(string hash, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
}

