using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Clients.Queries;

public record GetClientByIdQuery(Guid Id) : IRequest<ClientListItemDto?>;

public class GetClientByIdHandler : IRequestHandler<GetClientByIdQuery, ClientListItemDto?>
{
    private readonly IClientRepository _clients;
    private readonly ILoyaltyRepository _loyalty;

    public GetClientByIdHandler(IClientRepository clients, ILoyaltyRepository loyalty)
    {
        _clients = clients; _loyalty = loyalty;
    }

    public async Task<ClientListItemDto?> Handle(GetClientByIdQuery request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(request.Id, ct);
        if (c is null) return null;

        // DTO tipado em vez da entidade crua (não vaza OtpCode/flags internos).
        // Pontos da wallet, visitas derivadas — campos do Client aposentados.
        var wallet = await _loyalty.GetWalletAsync(c.Id, ct);
        var visits = await _loyalty.CountCompletedVisitsAsync(c.Id, ct);
        var lastVisit = (await _loyalty.GetVisitStatsAsync(c.TenantId, ct)).GetValueOrDefault(c.Id)?.LastVisitAt;
        return new ClientListItemDto(
            c.Id, c.Name, c.PhoneNumber, c.Email,
            visits, lastVisit, wallet?.TotalPoints ?? 0, c.IsBlocked);
    }
}
