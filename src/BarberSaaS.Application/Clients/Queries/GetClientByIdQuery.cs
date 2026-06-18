using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Clients.Queries;

public record GetClientByIdQuery(Guid Id) : IRequest<ClientListItemDto?>;

public class GetClientByIdHandler : IRequestHandler<GetClientByIdQuery, ClientListItemDto?>
{
    private readonly IClientRepository _clients;

    public GetClientByIdHandler(IClientRepository clients) => _clients = clients;

    public async Task<ClientListItemDto?> Handle(GetClientByIdQuery request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(request.Id, ct);
        // DTO tipado em vez da entidade crua (não vaza OtpCode/flags internos).
        return c is null ? null : new ClientListItemDto(
            c.Id, c.Name, c.PhoneNumber, c.Email,
            c.TotalVisits, c.LastVisitAt, c.LoyaltyPoints, c.IsBlocked);
    }
}
