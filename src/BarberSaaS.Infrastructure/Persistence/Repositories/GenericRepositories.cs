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

    // Confirmação de e-mail é anônima (sem tenant no contexto) — precisa ignorar o filtro global.
    public async Task<User?> GetByEmailVerifyTokenAsync(string token, CancellationToken ct = default)
        => await _set.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.EmailVerifyToken == token && !u.IsDeleted, ct);

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

    public async Task<IReadOnlyList<Goal>> GetAllByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Include(g => g.Contributions)
            .Where(g => g.TenantId == tenantId)
            // Ativas primeiro; dentro de cada grupo, as mais recentes no topo.
            .OrderByDescending(g => g.Status == GoalStatus.Active)
            .ThenByDescending(g => g.UpdatedAt)
            .ToListAsync(ct);

    // Add() explícito marca a contribuição como Added (-> INSERT). Se ela fosse anexada
    // só pela navegação Goal.Contributions, o change tracker a marcaria como Modified
    // (porque nasce com Id Guid preenchido no construtor) -> UPDATE numa linha inexistente
    // -> "0 rows affected" -> DbUpdateConcurrencyException (o 500 do Contribuir).
    // A Goal já está rastreada (CurrentAmount/Status alterados), então o mesmo SaveChanges
    // persiste o UPDATE da meta e o INSERT da contribuição numa única transação.
    public async Task AddContributionAsync(GoalContribution contribution, CancellationToken ct = default)
    {
        _db.Set<GoalContribution>().Add(contribution);
        await _db.SaveChangesAsync(ct);
    }
}

public class BarberServiceRepository : IBarberServiceRepository
{
    private readonly AppDbContext _db;
    public BarberServiceRepository(AppDbContext db) => _db = db;

    public async Task<decimal?> GetCustomPriceAsync(Guid tenantId, Guid barberId, Guid serviceId, CancellationToken ct = default)
        => await _db.Set<BarberService>()
            // bs.TenantId == tenantId é a defesa explícita: BarberService não tem filtro
            // global de tenant e no fluxo público o filtro fica off. A PK (BarberId,ServiceId)
            // já é única por tenant, mas reforçamos para impedir leitura cross-tenant.
            .Where(bs => bs.TenantId == tenantId && bs.BarberId == barberId && bs.ServiceId == serviceId)
            // Projeta decimal?: "sem linha" e "linha com CustomPrice null" colapsam em null -> fallback.
            .Select(bs => bs.CustomPrice)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<BarberService>> GetByBarberAsync(Guid tenantId, Guid barberId, CancellationToken ct = default)
        => await _db.Set<BarberService>().AsNoTracking()
            .Where(bs => bs.TenantId == tenantId && bs.BarberId == barberId)
            .ToListAsync(ct);

    public async Task UpsertAsync(Guid tenantId, Guid barberId, Guid serviceId, decimal? customPrice, CancellationToken ct = default)
    {
        // Lição das Metas: a PK (BarberId,ServiceId) já vem preenchida, então um
        // DbSet.Update() cego marcaria a linha como Modified -> UPDATE numa linha que
        // pode não existir -> DbUpdateConcurrencyException. Por isso: checa existência
        // (rastreada) e decide entre mutar (UPDATE) e Add (INSERT).
        var existing = await _db.Set<BarberService>()
            .FirstOrDefaultAsync(bs => bs.TenantId == tenantId && bs.BarberId == barberId && bs.ServiceId == serviceId, ct);
        if (existing is null)
            _db.Set<BarberService>().Add(new BarberService
            {
                TenantId = tenantId, BarberId = barberId, ServiceId = serviceId, CustomPrice = customPrice
            });
        else
            existing.CustomPrice = customPrice; // rastreada -> Modified -> UPDATE
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> RemoveAsync(Guid tenantId, Guid barberId, Guid serviceId, CancellationToken ct = default)
    {
        var existing = await _db.Set<BarberService>()
            .FirstOrDefaultAsync(bs => bs.TenantId == tenantId && bs.BarberId == barberId && bs.ServiceId == serviceId, ct);
        if (existing is null) return false;
        _db.Set<BarberService>().Remove(existing);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task ReplaceSetAsync(Guid tenantId, Guid barberId, IReadOnlyList<(Guid ServiceId, decimal? CustomPrice)> items, CancellationToken ct = default)
    {
        // Carrega os vínculos atuais RASTREADOS (sem AsNoTracking): vamos mutar/remover.
        var existing = await _db.Set<BarberService>()
            .Where(bs => bs.TenantId == tenantId && bs.BarberId == barberId)
            .ToListAsync(ct);
        var byService = existing.ToDictionary(bs => bs.ServiceId);
        var wanted    = items.Select(i => i.ServiceId).ToHashSet();

        // Remove os que saíram do conjunto desejado.
        foreach (var bs in existing)
            if (!wanted.Contains(bs.ServiceId))
                _db.Set<BarberService>().Remove(bs);

        // Add (INSERT) os novos; mutação rastreada (UPDATE) os já existentes.
        foreach (var (serviceId, customPrice) in items)
        {
            if (byService.TryGetValue(serviceId, out var bs))
                bs.CustomPrice = customPrice;       // Modified -> UPDATE
            else
                _db.Set<BarberService>().Add(new BarberService
                {
                    TenantId = tenantId, BarberId = barberId, ServiceId = serviceId, CustomPrice = customPrice
                });
        }

        // add + update + remove numa única transação.
        await _db.SaveChangesAsync(ct);
    }
}

public class ProductRepository : BaseRepository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<Product>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Include(p => p.Category).Where(p => p.TenantId == tenantId && p.IsActive).ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> GetLowStockAsync(Guid tenantId, CancellationToken ct = default)
        => await _set.AsNoTracking().Where(p => p.TenantId == tenantId && p.IsActive && p.StockQuantity <= p.MinStockAlert).ToListAsync(ct);
}

public class ProductCategoryRepository : BaseRepository<ProductCategory>, IProductCategoryRepository
{
    public ProductCategoryRepository(AppDbContext db) : base(db) { }
}

public class StockMovementRepository : BaseRepository<StockMovement>, IStockMovementRepository
{
    public StockMovementRepository(AppDbContext db) : base(db) { }
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

