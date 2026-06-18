using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Interfaces.Repositories;

namespace BarberSaaS.Application.Common.Interfaces;

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
}

public interface ITenantRepository : IBaseRepository<Tenant>
{
    Task<Tenant?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
    Task<Tenant?> GetWithSettingsAsync(Guid id, CancellationToken ct = default);
}

public interface IBarberRepository : IBaseRepository<Barber>
{
    Task<IReadOnlyList<Barber>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default);
    Task<Barber?> GetWithScheduleAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Barber>> GetShowInPublicPageAsync(Guid tenantId, CancellationToken ct = default);
}

public interface IClientRepository : IBaseRepository<Client>
{
    Task<Client?> GetByPhoneAsync(string phone, Guid tenantId, CancellationToken ct = default);
    Task<bool> PhoneExistsAsync(string phone, Guid tenantId, CancellationToken ct = default);
}

public interface IServiceRepository : IBaseRepository<Service>
{
    Task<IReadOnlyList<Service>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default);
    Task<IReadOnlyList<Service>> GetPublicByTenantAsync(Guid tenantId, CancellationToken ct = default);
}

public interface IFinancialRepository : IBaseRepository<FinancialTransaction>
{
    Task<IReadOnlyList<FinancialTransaction>> GetByPeriodAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<decimal> GetTotalRevenueAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<decimal> GetTotalExpenseAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
}

public interface IGoalRepository : IBaseRepository<Goal>
{
    Task<IReadOnlyList<Goal>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default);
}

public interface IProductRepository : IBaseRepository<Product>
{
    Task<IReadOnlyList<Product>> GetActiveByTenantAsync(Guid tenantId, CancellationToken ct = default);
    Task<IReadOnlyList<Product>> GetLowStockAsync(Guid tenantId, CancellationToken ct = default);
}

public interface IProductCategoryRepository : IBaseRepository<ProductCategory> { }

public interface IStockMovementRepository : IBaseRepository<StockMovement> { }

public interface INotificationRepository : IBaseRepository<NotificationQueue>
{
    Task<IReadOnlyList<NotificationQueue>> GetPendingAsync(int limit = 50, CancellationToken ct = default);
}

public interface IPlanRepository : IBaseRepository<Plan>
{
    Task<Plan?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<IReadOnlyList<Plan>> GetPublicPlansAsync(CancellationToken ct = default);
}

public interface IRefreshTokenRepository : IBaseRepository<RefreshToken>
{
    Task<RefreshToken?> GetByHashAsync(string hash, CancellationToken ct = default);
}

public interface IWorkScheduleRepository : IBaseRepository<WorkSchedule>
{
    Task<WorkSchedule?> GetWithShiftsAsync(Guid barberId, CancellationToken ct = default);
}

public interface IAppointmentRepositoryApp
{
    Task<IReadOnlyList<Appointment>> GetByBarberAndDateAsync(Guid barberId, DateOnly date, CancellationToken ct = default);
    Task<IReadOnlyList<DayOff>> GetDaysOffAsync(Guid barberId, DateOnly date, CancellationToken ct = default);
}

public interface IAppointmentRepositoryFull : IAppointmentRepositoryApp
{
    Task<Appointment> AddAsync(Appointment appointment, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetConflictingAsync(Guid barberId, DateOnly date, TimeOnly start, TimeOnly end, CancellationToken ct = default);
    Task<Appointment?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task UpdateAsync(Appointment appointment, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetByTenantAndDateAsync(Guid tenantId, DateOnly date, Guid? barberId, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetByClientAsync(Guid clientId, CancellationToken ct = default);
}
