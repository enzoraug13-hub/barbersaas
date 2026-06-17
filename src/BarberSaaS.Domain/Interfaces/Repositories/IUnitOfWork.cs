using System.Data;

namespace BarberSaaS.Domain.Interfaces.Repositories;

public interface IUnitOfWork : IDisposable
{
    IAppointmentRepository Appointments { get; }
    Task<int> CommitAsync(CancellationToken ct = default);
    Task<IDisposable> BeginTransactionAsync(IsolationLevel isolation = IsolationLevel.ReadCommitted, CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
