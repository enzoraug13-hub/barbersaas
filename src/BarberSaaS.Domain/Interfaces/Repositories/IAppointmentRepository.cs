using BarberSaaS.Domain.Entities;

namespace BarberSaaS.Domain.Interfaces.Repositories;

public interface IAppointmentRepository : IBaseRepository<Appointment>
{
    Task<IReadOnlyList<Appointment>> GetByBarberAndDateAsync(Guid barberId, DateOnly date, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetByClientAsync(Guid clientId, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetByTenantAndDateRangeAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetConflictingAsync(Guid barberId, DateOnly date, TimeOnly start, TimeOnly end, CancellationToken ct = default);
    Task<IReadOnlyList<Appointment>> GetUpcomingWithoutReminderAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task<Appointment?> GetWithDetailsAsync(Guid id, CancellationToken ct = default);
}
