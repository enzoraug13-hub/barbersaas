using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class WorkSchedule : BaseEntity
{
    public Guid BarberId { get; set; }
    public bool IsActive { get; set; } = true;

    public Barber? Barber { get; set; }
    public ICollection<WorkShift> WorkShifts { get; set; } = new List<WorkShift>();
}

public class WorkShift : BaseEntity
{
    public Guid WorkScheduleId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsActive { get; set; } = true;

    public WorkSchedule? WorkSchedule { get; set; }
    public ICollection<ShiftBreak> Breaks { get; set; } = new List<ShiftBreak>();
}

public class ShiftBreak : BaseEntity
{
    public Guid WorkShiftId { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public WorkShift? WorkShift { get; set; }
}

public class DayOff : BaseEntity
{
    public Guid BarberId { get; set; }
    public DateOnly Date { get; set; }
    public string? Reason { get; set; }
    public bool IsFullDay { get; set; } = true;
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }

    public Barber? Barber { get; set; }
}
