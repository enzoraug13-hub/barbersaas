using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public TenantSettings? Settings { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Barber> Barbers { get; set; } = new List<Barber>();
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public Subscription? Subscription { get; set; }
}
