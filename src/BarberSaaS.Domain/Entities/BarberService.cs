using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class BarberService
{
    public Guid BarberId { get; set; }
    public Guid ServiceId { get; set; }
    public Guid TenantId { get; set; }
    public decimal? CustomPrice { get; set; }

    public Barber? Barber { get; set; }
    public Service? Service { get; set; }
}
