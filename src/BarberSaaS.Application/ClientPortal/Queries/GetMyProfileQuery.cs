using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Queries;

// Área do cliente autenticado por OTP: usa o id do próprio cliente (claim sub).
public record GetMyProfileQuery : IRequest<MyProfileDto?>;

public record MyProfileDto(Guid Id, string Name, string Phone, string? Cpf, string? Email, int LoyaltyPoints, int TotalVisits, bool ProfileComplete);

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
        if (c is null)
        {
            // Telefone validado por OTP, mas cadastro ainda não completado —
            // Client não existe no banco de propósito (ver VerifyClientOtpCommand/
            // UpdateMyProfileCommand). Devolve "perfil vazio" em vez de 404: a
            // tela de completar cadastro espera um corpo 200 com profileComplete:false.
            return new MyProfileDto(_user.Id, "", _user.Phone ?? "", null, null, 0, 0, false);
        }
        var complete = !string.IsNullOrWhiteSpace(c.Name) && !string.IsNullOrWhiteSpace(c.Cpf);
        return new MyProfileDto(c.Id, c.Name, c.PhoneNumber, c.Cpf, c.Email, c.LoyaltyPoints, c.TotalVisits, complete);
    }
}
