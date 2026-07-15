using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Status da conta, controlado pelo super admin. Suspended bloqueia o login
    /// dos usuários do tenant (ver LoginCommand). Não confundir com IsActive
    /// (legado, sem uso em lógica).
    /// </summary>
    public TenantStatus Status { get; set; } = TenantStatus.Active;

    public TenantSettings? Settings { get; set; }
    // SEM coleção de Users (e sem FK Users→Tenants no banco): o super admin é um
    // usuário sem tenant (TenantId = Guid.Empty), o que violaria a FK. O vínculo
    // usuário→barbearia segue sendo Users.TenantId, consultado por join explícito
    // (ver SuperAdminRepository) e protegido pelo filtro global como sempre.
    public ICollection<Barber> Barbers { get; set; } = new List<Barber>();
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public Subscription? Subscription { get; set; }
}
