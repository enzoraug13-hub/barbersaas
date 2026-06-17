using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Barbers.Queries;

public record GetWorkScheduleQuery(Guid BarberId) : IRequest<WorkScheduleDto?>;

public record WorkScheduleDto(Guid Id, Guid BarberId, bool IsActive, IReadOnlyList<WorkShiftDto> Shifts);
public record WorkShiftDto(Guid Id, int DayOfWeek, string StartTime, string EndTime, bool IsActive, IReadOnlyList<ShiftBreakDto> Breaks);
public record ShiftBreakDto(Guid Id, string StartTime, string EndTime);

public class GetWorkScheduleHandler : IRequestHandler<GetWorkScheduleQuery, WorkScheduleDto?>
{
    private readonly IWorkScheduleRepository _schedules;

    public GetWorkScheduleHandler(IWorkScheduleRepository schedules) => _schedules = schedules;

    public async Task<WorkScheduleDto?> Handle(GetWorkScheduleQuery request, CancellationToken ct)
    {
        var schedule = await _schedules.GetWithShiftsAsync(request.BarberId, ct);
        if (schedule == null) return null;

        return new WorkScheduleDto(schedule.Id, schedule.BarberId, schedule.IsActive,
            schedule.WorkShifts
                .OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime)
                .Select(s => new WorkShiftDto(
                    s.Id, (int)s.DayOfWeek,
                    s.StartTime.ToString("HH:mm"),
                    s.EndTime.ToString("HH:mm"),
                    s.IsActive,
                    s.Breaks.Select(b => new ShiftBreakDto(b.Id, b.StartTime.ToString("HH:mm"), b.EndTime.ToString("HH:mm"))).ToList()
                )).ToList());
    }
}
