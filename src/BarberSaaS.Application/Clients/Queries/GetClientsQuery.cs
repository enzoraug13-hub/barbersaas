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

    public GetClientsHandler(IClientRepository clients) => _clients = clients;

    public async Task<IReadOnlyList<ClientListItemDto>> Handle(GetClientsQuery request, CancellationToken ct)
    {
        var all = await _clients.GetAllAsync(ct);
        if (!string.IsNullOrEmpty(request.Search))
            all = all.Where(c => c.Name.Contains(request.Search, StringComparison.OrdinalIgnoreCase) ||
                                 c.PhoneNumber.Contains(request.Search)).ToList();

        return all.Select(c => new ClientListItemDto(
            c.Id, c.Name, c.PhoneNumber, c.Email,
            c.TotalVisits, c.LastVisitAt, c.LoyaltyPoints, c.IsBlocked)).ToList();
    }
}
