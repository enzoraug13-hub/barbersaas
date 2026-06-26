using BarberSaaS.Domain.Entities;

namespace BarberSaaS.Domain.Interfaces.Services;

// IsAvailable=false => horário existe na grade mas está ocupado (tem agendamento).
// Pausa do barbeiro, folga e horários já passados NÃO entram na lista (ficam ocultos).
public record TimeSlot(TimeOnly Start, TimeOnly End, bool IsAvailable);

public interface ISlotGeneratorService
{
    IReadOnlyList<TimeSlot> GenerateDaySlots(
        WorkSchedule schedule,
        IEnumerable<Appointment> existingAppointments,
        IEnumerable<DayOff> daysOff,
        DateOnly date,
        int serviceDurationMinutes,
        int slotIntervalMinutes = 15);
}
