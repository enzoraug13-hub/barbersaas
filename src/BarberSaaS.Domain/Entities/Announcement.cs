using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

/// <summary>
/// Comunicado do Trimly (super admin) para as barbearias — "vai ter atualização
/// amanhã", "novidade X no sistema". Aparece no painel do dono.
///
/// Alvo: <see cref="TargetTenantId"/> nulo = broadcast (todas as barbearias);
/// preenchido = só aquela barbearia. NÃO confundir com o TenantId herdado de
/// BaseEntity: nesta entidade ele guarda apenas o tenant de quem publicou
/// (carimbado no SaveChanges) e não participa de nenhuma query — o aviso é um
/// dado GLOBAL, excluído do filtro de tenant no AppDbContext (como o Tenant raiz),
/// e a visibilidade é decidida exclusivamente por TargetTenantId no repositório.
/// </summary>
public class Announcement : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Nulo = broadcast para todas as barbearias.</summary>
    public Guid? TargetTenantId { get; set; }
    public Tenant? TargetTenant { get; set; }
}

/// <summary>
/// Marca de "lido" POR BARBEARIA (uma linha por aviso + tenant): o alvo do aviso
/// é a barbearia, então o lido também é — sem granularidade por usuário de
/// propósito. O momento da leitura é o CreatedAt da linha. Diferente do
/// Announcement, esta entidade É isolada pelo filtro global de tenant
/// (TenantId = barbearia que leu), como qualquer dado operacional.
/// </summary>
public class AnnouncementRead : BaseEntity
{
    public Guid AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }
}
