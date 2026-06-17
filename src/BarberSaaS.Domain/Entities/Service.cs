using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class Service : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? ColorHex { get; set; }
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;
    public bool ShowInPublicPage { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;

    public Tenant? Tenant { get; set; }
    public ICollection<BarberService> BarberServices { get; set; } = new List<BarberService>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
