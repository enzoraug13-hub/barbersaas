using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

public class AppointmentRepository :
    BaseRepository<Appointment>,
    IAppointmentRepositoryFull,
    IAppointmentRepositoryApp
{
    public AppointmentRepository(AppDbContext db) : base(db) { }

    public async Task<IReadOnlyList<Appointment>> GetByBarberAndDateAsync(Guid barberId, DateOnly date, CancellationToken ct = default)
        => await _set
            .Include(a => a.Client)
            .Include(a => a.Service)
            .Where(a => a.BarberId == barberId && a.Date == date && a.Status != AppointmentStatus.Cancelled)
            .OrderBy(a => a.StartTime)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<DayOff>> GetDaysOffAsync(Guid barberId, DateOnly date, CancellationToken ct = default)
        => await _db.DaysOff
            .Where(d => d.BarberId == barberId && d.Date == date)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Appointment>> GetConflictingAsync(Guid barberId, DateOnly date, TimeOnly start, TimeOnly end, CancellationToken ct = default)
        => await _set
            .Where(a =>
                a.BarberId == barberId &&
                a.Date     == date &&
                a.Status   != AppointmentStatus.Cancelled &&
                a.StartTime < end &&
                a.EndTime   > start)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Appointment>> GetByTenantAndDateAsync(Guid tenantId, DateOnly date, Guid? barberId, CancellationToken ct = default)
    {
        var query = _set
            .AsNoTracking()
            .Include(a => a.Client)
            .Include(a => a.Barber)
            .Include(a => a.Service)
            .Where(a => a.TenantId == tenantId && a.Date == date);

        if (barberId.HasValue)
            query = query.Where(a => a.BarberId == barberId.Value);

        return await query.OrderBy(a => a.StartTime).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Appointment>> GetByClientAsync(Guid clientId, CancellationToken ct = default)
        => await _set.AsNoTracking()
            .Include(a => a.Barber)
            .Include(a => a.Service)
            .Where(a => a.ClientId == clientId)
            .OrderByDescending(a => a.Date).ThenByDescending(a => a.StartTime)
            .ToListAsync(ct);
}
