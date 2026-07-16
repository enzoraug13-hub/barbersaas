using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Clients.Queries;

public record GetClientsQuery(string? Search) : IRequest<IReadOnlyList<ClientListItemDto>>;

public record ClientListItemDto(
    Guid Id, string Name, string PhoneNumber, string? Email,
    int TotalVisits, DateTime? LastVisitAt, int LoyaltyPoints, bool IsBlocked);

public class GetClientsHandler : IRequestHandler<GetClientsQuery, IReadOnlyList<ClientListItemDto>>
{
    private readonly IClientRepository _clients;
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;

    public GetClientsHandler(IClientRepository clients, ILoyaltyRepository loyalty, ICurrentTenant tenant)
    {
        _clients = clients; _loyalty = loyalty; _tenant = tenant;
    }

    public async Task<IReadOnlyList<ClientListItemDto>> Handle(GetClientsQuery request, CancellationToken ct)
    {
        var all = await _clients.GetAllAsync(ct);
        if (!string.IsNullOrEmpty(request.Search))
            all = all.Where(c => c.Name.Contains(request.Search, StringComparison.OrdinalIgnoreCase) ||
                                 c.PhoneNumber.Contains(request.Search)).ToList();

        // Fonte da verdade: pontos da wallet, visitas derivadas dos Appointments
        // Completed (os campos do Client estão aposentados — ver ILoyaltyRepository).
        var balances = (await _loyalty.ListBalancesAsync(_tenant.Id, ct))
            .ToDictionary(b => b.ClientId, b => b.TotalPoints);
        var visits = await _loyalty.GetVisitStatsAsync(_tenant.Id, ct);

        return all.Select(c => new ClientListItemDto(
            c.Id, c.Name, c.PhoneNumber, c.Email,
            visits.TryGetValue(c.Id, out var v) ? v.Visits : 0,
            visits.TryGetValue(c.Id, out var lv) ? lv.LastVisitAt : null,
            balances.GetValueOrDefault(c.Id),
            c.IsBlocked)).ToList();
    }
}
