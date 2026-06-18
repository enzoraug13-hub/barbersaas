using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Queries;

// Área do cliente autenticado por OTP: usa o id do próprio cliente (claim sub).
public record GetMyProfileQuery : IRequest<MyProfileDto?>;

public record MyProfileDto(Guid Id, string Name, string Phone, string? Email, int LoyaltyPoints, int TotalVisits);

public class GetMyProfileHandler : IRequestHandler<GetMyProfileQuery, MyProfileDto?>
{
    private readonly IClientRepository _clients;
    private readonly ICurrentUser _user;

    public GetMyProfileHandler(IClientRepository clients, ICurrentUser user)
    {
        _clients = clients; _user = user;
    }

    public async Task<MyProfileDto?> Handle(GetMyProfileQuery request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(_user.Id, ct);
        return c is null ? null : new MyProfileDto(c.Id, c.Name, c.PhoneNumber, c.Email, c.LoyaltyPoints, c.TotalVisits);
    }
}
