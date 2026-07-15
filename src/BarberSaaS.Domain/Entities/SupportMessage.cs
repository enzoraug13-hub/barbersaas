using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

/// <summary>
/// Mensagem do canal de suporte entre UMA barbearia e o Trimly (super admin) —
/// o sentido inverso dos avisos: aqui é o dono quem escreve ("queria tal recurso")
/// e o super admin responde. Tudo in-app, sem e-mail/SMS.
///
/// Diferente do Announcement (dado global), a mensagem de suporte é dado
/// operacional DA barbearia: o TenantId herdado é a própria conversa — todas as
/// mensagens do mesmo tenant, em ordem cronológica, formam o histórico. Por isso
/// a entidade fica DENTRO do filtro global de tenant: o dono só enxerga a própria
/// conversa por construção. O super admin cruza tenants via IgnoreQueryFilters
/// no repositório (mesmo padrão das faturas).
/// </summary>
public class SupportMessage : BaseEntity
{
    public SupportMessageAuthor Author { get; set; }
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// Quando o DESTINATÁRIO leu: mensagem do dono → lida pelo super admin;
    /// resposta do super admin → lida pelo dono. Nulo = não lida.
    /// </summary>
    public DateTime? ReadAt { get; set; }

    public Tenant? Tenant { get; set; }
}
