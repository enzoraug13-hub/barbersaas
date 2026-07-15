using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Support.Commands;

/// <summary>
/// Marca como lidas TODAS as respostas do Trimly ainda não lidas pela barbearia
/// logada (tenant do JWT). Em massa e idempotente — é o "abri a conversa" do chat.
/// Retorna quantas foram marcadas.
/// </summary>
public record MarkSupportRepliesReadCommand() : IRequest<int>;

public class MarkSupportRepliesReadHandler : IRequestHandler<MarkSupportRepliesReadCommand, int>
{
    private readonly ISupportMessageRepository _messages;
    private readonly ICurrentTenant _tenant;

    public MarkSupportRepliesReadHandler(ISupportMessageRepository messages, ICurrentTenant tenant)
    {
        _messages = messages; _tenant = tenant;
    }

    public Task<int> Handle(MarkSupportRepliesReadCommand request, CancellationToken ct)
        => _messages.MarkRepliesReadAsync(_tenant.Id, ct);
}
