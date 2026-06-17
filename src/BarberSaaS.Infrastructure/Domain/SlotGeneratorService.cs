using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Interfaces.Services;

namespace BarberSaaS.Infrastructure.Domain;

public class SlotGeneratorService : ISlotGeneratorService
{
    public IReadOnlyList<TimeSlot> GenerateAvailableSlots(
        WorkSchedule schedule,
        IEnumerable<Appointment> existingAppointments,
        IEnumerable<DayOff> daysOff,
        DateOnly date,
        int serviceDurationMinutes,
        int slotIntervalMinutes = 15)
    {
        var dayOfWeek = date.DayOfWeek;
        var dayOffList = daysOff.ToList();
        var apptList   = existingAppointments.ToList();
        var now        = DateTime.UtcNow.AddMinutes(30);

        var fullDayOff = dayOffList.FirstOrDefault(d => d.IsFullDay);
        if (fullDayOff != null) return Array.Empty<TimeSlot>();

        var shifts = schedule.WorkShifts
            .Where(s => s.DayOfWeek == dayOfWeek && s.IsActive)
            .ToList();

        if (!shifts.Any()) return Array.Empty<TimeSlot>();

        var duration = TimeSpan.FromMinutes(serviceDurationMinutes);
        var interval = TimeSpan.FromMinutes(slotIntervalMinutes);
        var slots    = new List<TimeSlot>();

        foreach (var shift in shifts)
        {
            var cursor   = shift.StartTime;
            var shiftEnd = shift.EndTime;

            while (cursor.ToTimeSpan() + duration <= shiftEnd.ToTimeSpan())
            {
                var slotStart = cursor;
                var slotEnd   = cursor.Add(duration);

                // Past check
                var slotDateTime = date.ToDateTime(slotStart, DateTimeKind.Utc);
                if (slotDateTime <= now) { cursor = cursor.Add(interval); continue; }

                // Break collision
                bool collidesBreak = shift.Breaks.Any(b =>
                    slotStart < b.EndTime && slotEnd > b.StartTime);

                // Appointment collision
                bool collidesAppt = apptList.Any(a =>
                    a.Status != AppointmentStatus.Cancelled &&
                    slotStart < a.EndTime && slotEnd > a.StartTime);

                // Partial day off collision
                bool collidesPartial = dayOffList.Any(d =>
                    !d.IsFullDay && d.StartTime.HasValue && d.EndTime.HasValue &&
                    slotStart < d.EndTime && slotEnd > d.StartTime);

                if (!collidesBreak && !collidesAppt && !collidesPartial)
                    slots.Add(new TimeSlot(slotStart, slotEnd));

                cursor = cursor.Add(interval);
            }
        }

        return slots.OrderBy(s => s.Start).ToList();
    }
}
