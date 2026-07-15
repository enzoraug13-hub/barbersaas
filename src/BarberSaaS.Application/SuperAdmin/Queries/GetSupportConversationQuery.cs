using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Support;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

/// <summary>
/// A conversa completa de UMA barbearia, em ordem cronológica, como o super
/// admin enxerga. Barbearia inexistente responde "não encontrada".
/// </summary>
public record GetSupportConversationQuery(Guid TenantId) : IRequest<SupportThreadDto>;

public record SupportThreadDto(
    Guid TenantId,
    string TenantName,
    IReadOnlyList<SupportMessageDto> Messages);

public class GetSupportConversationHandler
    : IRequestHandler<GetSupportConversationQuery, SupportThreadDto>
{
    private readonly ISupportMessageRepository _messages;
    private readonly ISuperAdminRepository _superAdmin;

    public GetSupportConversationHandler(ISupportMessageRepository messages, ISuperAdminRepository superAdmin)
    {
        _messages = messages; _superAdmin = superAdmin;
    }

    public async Task<SupportThreadDto> Handle(GetSupportConversationQuery request, CancellationToken ct)
    {
        var tenant = await _superAdmin.GetTenantAsync(request.TenantId, ct)
            ?? throw new Domain.Exceptions.DomainException("Barbearia não encontrada.");

        var rows = await _messages.ListConversationAsync(request.TenantId, ct);
        return new SupportThreadDto(tenant.Id, tenant.Name,
            rows.Select(SupportMessageDto.FromRow).ToList());
    }
}
