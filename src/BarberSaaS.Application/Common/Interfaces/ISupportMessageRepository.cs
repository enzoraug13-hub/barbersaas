using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Application.Common.Interfaces;

/// <summary>Uma mensagem da conversa (mesma linha para os dois lados).</summary>
public record SupportMessageRow(
    Guid Id,
    SupportMessageAuthor Author,
    string Body,
    DateTime CreatedAt,
    DateTime? ReadAt);

/// <summary>
/// Linha da lista de conversas do super admin: um tenant = uma conversa, com a
/// última mensagem de amostra e quantas mensagens do dono ainda não li.
/// </summary>
public record SupportConversationRow(
    Guid TenantId,
    string TenantName,
    string LastBody,
    SupportMessageAuthor LastAuthor,
    DateTime LastAt,
    int UnreadCount);

/// <summary>
/// Canal de suporte dono ↔ Trimly. Dois lados, regras distintas:
/// - Dono (ListForTenant/MarkRepliesRead): SEMPRE recebe o tenantId do chamador
///   (vindo do JWT via ICurrentTenant) — além do filtro global de tenant, que
///   também está ativo nesse contexto. Um dono nunca alcança conversa alheia.
/// - Super admin (ListConversations/MarkOwnerMessagesRead): cruza tenants de
///   propósito com IgnoreQueryFilters (o JWT dele carrega o tenant da barbearia
///   DELE — com o filtro ligado ele só veria a própria conversa), reaplicando
///   !IsDeleted à mão. Só atrás de RequireSuperAdmin.
/// </summary>
public interface ISupportMessageRepository
{
    // ---- comum ----
    Task AddAsync(SupportMessage message, CancellationToken ct = default);

    // ---- dono (tenant do JWT) ----
    Task<IReadOnlyList<SupportMessageRow>> ListForTenantAsync(Guid tenantId, CancellationToken ct = default);
    /// <summary>Marca como lidas as respostas do super admin ainda não lidas. Idempotente.</summary>
    Task<int> MarkRepliesReadAsync(Guid tenantId, CancellationToken ct = default);

    // ---- super admin (cruza tenants) ----
    Task<IReadOnlyList<SupportConversationRow>> ListConversationsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SupportMessageRow>> ListConversationAsync(Guid tenantId, CancellationToken ct = default);
    /// <summary>Marca como lidas as mensagens do dono ainda não lidas. Idempotente.</summary>
    Task<int> MarkOwnerMessagesReadAsync(Guid tenantId, CancellationToken ct = default);
}
