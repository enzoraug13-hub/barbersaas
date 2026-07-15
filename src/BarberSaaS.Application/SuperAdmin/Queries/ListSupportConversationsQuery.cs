using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Support;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

/// <summary>
/// Caixa de entrada do super admin: uma linha por barbearia que já trocou mensagem,
/// com a última mensagem de amostra e a contagem de não-lidas (mensagens do dono
/// que ainda não li). Ordenada pela conversa mais recente.
/// </summary>
public record ListSupportConversationsQuery() : IRequest<IReadOnlyList<SupportConversationDto>>;

public record SupportConversationDto(
    Guid TenantId,
    string TenantName,
    string LastBody,
    string LastAuthor,
    DateTime LastAt,
    int UnreadCount);

public class ListSupportConversationsHandler
    : IRequestHandler<ListSupportConversationsQuery, IReadOnlyList<SupportConversationDto>>
{
    private readonly ISupportMessageRepository _messages;

    public ListSupportConversationsHandler(ISupportMessageRepository messages) => _messages = messages;

    public async Task<IReadOnlyList<SupportConversationDto>> Handle(
        ListSupportConversationsQuery request, CancellationToken ct)
    {
        var rows = await _messages.ListConversationsAsync(ct);
        return rows.Select(r => new SupportConversationDto(
            r.TenantId, r.TenantName, r.LastBody,
            SupportMessageDto.AuthorName(r.LastAuthor), r.LastAt, r.UnreadCount)).ToList();
    }
}
