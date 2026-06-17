using BarberSaaS.Application.Barbers.Commands;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

public class WorkScheduleRepository : BaseRepository<WorkSchedule>, IWorkScheduleRepository, IWorkScheduleWriteRepository
{
    public WorkScheduleRepository(AppDbContext db) : base(db) { }

    public async Task<WorkSchedule?> GetWithShiftsAsync(Guid barberId, CancellationToken ct = default)
        => await _set.Include(ws => ws.WorkShifts).ThenInclude(s => s.Breaks)
            .FirstOrDefaultAsync(ws => ws.BarberId == barberId && ws.IsActive, ct);

    public async Task ReplaceShiftsAsync(Guid scheduleId, IReadOnlyList<WorkShift> newShifts, CancellationToken ct = default)
    {
        var existingShifts = await _db.WorkShifts
            .Where(s => s.WorkScheduleId == scheduleId)
            .Include(s => s.Breaks)
            .ToListAsync(ct);

        _db.ShiftBreaks.RemoveRange(existingShifts.SelectMany(s => s.Breaks));
        _db.WorkShifts.RemoveRange(existingShifts);

        await _db.WorkShifts.AddRangeAsync(newShifts, ct);
        await _db.SaveChangesAsync(ct);
    }
}
