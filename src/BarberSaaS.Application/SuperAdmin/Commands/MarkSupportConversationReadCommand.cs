using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>
/// Super admin marca como lidas TODAS as mensagens do dono ainda não lidas na
/// conversa de uma barbearia. Em massa e idempotente — é o "abri a conversa".
/// Retorna quantas foram marcadas.
/// </summary>
public record MarkSupportConversationReadCommand(Guid TenantId) : IRequest<int>;

public class MarkSupportConversationReadHandler
    : IRequestHandler<MarkSupportConversationReadCommand, int>
{
    private readonly ISupportMessageRepository _messages;

    public MarkSupportConversationReadHandler(ISupportMessageRepository messages) => _messages = messages;

    public Task<int> Handle(MarkSupportConversationReadCommand request, CancellationToken ct)
        => _messages.MarkOwnerMessagesReadAsync(request.TenantId, ct);
}
