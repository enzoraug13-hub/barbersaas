using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Interfaces.Repositories;

namespace BarberSaaS.Application.Common.Interfaces;

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByEmailVerifyTokenAsync(string token, CancellationToken ct = default);
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

/// <summary>
/// Tokens OAuth do Google por barbeiro. NÃO estende IBaseRepository de propósito:
/// a exclusão aqui é FÍSICA (hard delete) — token revogado/substituído não pode
/// sobreviver como linha soft-deleted (além de conflitar com o índice único de BarberId).
/// </summary>
public interface IBarberGoogleCredentialRepository
{
    Task<BarberGoogleCredential?> GetByBarberIdAsync(Guid barberId, CancellationToken ct = default);
    Task AddAsync(BarberGoogleCredential credential, CancellationToken ct = default);
    Task UpdateAsync(BarberGoogleCredential credential, CancellationToken ct = default);
    Task DeleteByBarberIdAsync(Guid barberId, CancellationToken ct = default);
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

public interface IBarberServiceRepository
{
    // Preço do barbeiro para o serviço, ou null quando (a) não há vínculo BarberService
    // ou (b) há vínculo mas CustomPrice é null — ambos os casos caem no fallback
    // service.Price no handler. O tenantId é passado explicitamente (defesa-em-profundidade):
    // BarberService não herda BaseEntity, então NÃO tem o filtro global de tenant — e no
    // fluxo público o filtro fica off de qualquer forma. Ver IGoalRepository para a regra
    // de FirstOrDefaultAsync/filtros globais.
    Task<decimal?> GetCustomPriceAsync(Guid tenantId, Guid barberId, Guid serviceId, CancellationToken ct = default);

    // Vínculos explícitos do barbeiro (só as linhas que existem). O GET/lote cruza isso
    // com a lista de serviços do tenant para montar isOffered/effectivePrice.
    Task<IReadOnlyList<BarberService>> GetByBarberAsync(Guid tenantId, Guid barberId, CancellationToken ct = default);

    // Upsert unitário. Segue a lição das Metas: checa existência (rastreada) e decide
    // entre mutar (UPDATE) e Add (INSERT) — NUNCA DbSet.Update() cego numa PK pré-preenchida.
    Task UpsertAsync(Guid tenantId, Guid barberId, Guid serviceId, decimal? customPrice, CancellationToken ct = default);

    // Desvincula. Retorna false se não havia linha (idempotente).
    Task<bool> RemoveAsync(Guid tenantId, Guid barberId, Guid serviceId, CancellationToken ct = default);

    // Substitui o conjunto inteiro do barbeiro (add + update + remove) numa única transação.
    Task ReplaceSetAsync(Guid tenantId, Guid barberId, IReadOnlyList<(Guid ServiceId, decimal? CustomPrice)> items, CancellationToken ct = default);
}

public interface IFinancialRepository : IBaseRepository<FinancialTransaction>
{
    Task<IReadOnlyList<FinancialTransaction>> GetByPeriodAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<decimal> GetTotalRevenueAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<decimal> GetTotalExpenseAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);

    /// <summary>Transação vinculada ao agendamento (usada para idempotência e estorno).</summary>
    Task<FinancialTransaction?> GetByAppointmentIdAsync(Guid tenantId, Guid appointmentId, CancellationToken ct = default);

    /// <summary>
    /// Cria retroativamente as receitas de agendamentos Completed que ainda não têm
    /// FinancialTransaction (concluídos antes do elo agendamento→financeiro existir).
    /// Idempotente. Retorna quantas transações foram criadas.
    /// </summary>
    Task<int> BackfillCompletedAppointmentsAsync(Guid tenantId, Guid createdByUserId, CancellationToken ct = default);
}

public interface IGoalRepository : IBaseRepository<Goal>
{
    // Traz TODAS as metas do tenant (ativas e concluídas) — a tela de Metas filtra por aba
    // (Ativas | Concluídas | Todas). Meta concluída não some do banco: só muda Status p/ Completed.
    Task<IReadOnlyList<Goal>> GetAllByTenantAsync(Guid tenantId, CancellationToken ct = default);

    // Persiste uma nova contribuição (INSERT) junto com a alteração de CurrentAmount/Status
    // da meta rastreada (UPDATE), num único SaveChanges. Add() explícito é necessário porque
    // a contribuição nasce com Id (Guid) preenchido no construtor; ao adicioná-la só pela
    // navegação Goal.Contributions, o change tracker a marcaria como Modified -> UPDATE numa
    // linha inexistente -> DbUpdateConcurrencyException. DbSet.Add a marca como Added.
    Task AddContributionAsync(GoalContribution contribution, CancellationToken ct = default);
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
