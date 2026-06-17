using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

public record UpdateWorkScheduleCommand(
    Guid BarberId,
    IReadOnlyList<ShiftInput> Shifts) : IRequest<bool>;

public record ShiftInput(int DayOfWeek, string StartTime, string EndTime, bool IsActive);

public class UpdateWorkScheduleHandler : IRequestHandler<UpdateWorkScheduleCommand, bool>
{
    private readonly IWorkScheduleRepository _schedules;
    private readonly IWorkScheduleWriteRepository _write;

    public UpdateWorkScheduleHandler(IWorkScheduleRepository schedules, IWorkScheduleWriteRepository write)
    {
        _schedules = schedules;
        _write = write;
    }

    public async Task<bool> Handle(UpdateWorkScheduleCommand request, CancellationToken ct)
    {
        var schedule = await _schedules.GetWithShiftsAsync(request.BarberId, ct);
        if (schedule == null) throw new InvalidOperationException("Horário não encontrado para este barbeiro.");

        // Remove shifts existentes e recria
        await _write.ReplaceShiftsAsync(schedule.Id, request.Shifts.Select(s => new WorkShift
        {
            TenantId       = schedule.TenantId,
            WorkScheduleId = schedule.Id,
            DayOfWeek      = (DayOfWeek)s.DayOfWeek,
            StartTime      = TimeOnly.Parse(s.StartTime),
            EndTime        = TimeOnly.Parse(s.EndTime),
            IsActive       = s.IsActive
        }).ToList(), ct);

        return true;
    }
}

public interface IWorkScheduleWriteRepository
{
    Task ReplaceShiftsAsync(Guid scheduleId, IReadOnlyList<WorkShift> newShifts, CancellationToken ct = default);
}
