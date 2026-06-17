using BarberSaaS.Domain.Entities;

namespace BarberSaaS.Domain.Interfaces.Services;

public record TimeSlot(TimeOnly Start, TimeOnly End);

public interface ISlotGeneratorService
{
    IReadOnlyList<TimeSlot> GenerateAvailableSlots(
        WorkSchedule schedule,
        IEnumerable<Appointment> existingAppointments,
        IEnumerable<DayOff> daysOff,
        DateOnly date,
        int serviceDurationMinutes,
        int slotIntervalMinutes = 15);
}
