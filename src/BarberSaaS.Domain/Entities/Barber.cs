using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class Barber : BaseEntity
{
    /// <summary>Opcional: barbeiro não tem login próprio (legado — barbeiros antigos podem ter um User vinculado).</summary>
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }

    public CommissionType CommissionType { get; set; } = CommissionType.Percentage;
    public decimal CommissionValue { get; set; } = 0;

    public string? GoogleCalendarId { get; set; }
    public string? GoogleCalendarColor { get; set; }

    public bool IsActive { get; set; } = true;
    public bool ShowInPublicPage { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;

    public Tenant? Tenant { get; set; }
    public User? User { get; set; }
    public ICollection<WorkSchedule> WorkSchedules { get; set; } = new List<WorkSchedule>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<BarberService> BarberServices { get; set; } = new List<BarberService>();
    public ICollection<DayOff> DaysOff { get; set; } = new List<DayOff>();
}
