using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Support.Queries;

/// <summary>
/// Conversa de suporte da barbearia LOGADA com o Trimly, em ordem cronológica.
/// O tenant vem do JWT (ICurrentTenant) — nunca do request, então um dono não
/// tem como ler a conversa de outra barbearia.
/// </summary>
public record ListMySupportMessagesQuery() : IRequest<IReadOnlyList<SupportMessageDto>>;

public class ListMySupportMessagesHandler
    : IRequestHandler<ListMySupportMessagesQuery, IReadOnlyList<SupportMessageDto>>
{
    private readonly ISupportMessageRepository _messages;
    private readonly ICurrentTenant _tenant;

    public ListMySupportMessagesHandler(ISupportMessageRepository messages, ICurrentTenant tenant)
    {
        _messages = messages; _tenant = tenant;
    }

    public async Task<IReadOnlyList<SupportMessageDto>> Handle(
        ListMySupportMessagesQuery request, CancellationToken ct)
    {
        var rows = await _messages.ListForTenantAsync(_tenant.Id, ct);
        return rows.Select(SupportMessageDto.FromRow).ToList();
    }
}
