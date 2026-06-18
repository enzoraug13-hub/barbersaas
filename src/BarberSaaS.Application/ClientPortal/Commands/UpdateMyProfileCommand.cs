using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Commands;

public record UpdateMyProfileCommand(string? Name, string? Email) : IRequest<bool>;

public class UpdateMyProfileHandler : IRequestHandler<UpdateMyProfileCommand, bool>
{
    private readonly IClientRepository _clients;
    private readonly ICurrentUser _user;

    public UpdateMyProfileHandler(IClientRepository clients, ICurrentUser user)
    {
        _clients = clients; _user = user;
    }

    public async Task<bool> Handle(UpdateMyProfileCommand request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(_user.Id, ct);
        if (c is null) return false;
        if (!string.IsNullOrWhiteSpace(request.Name)) c.Name = request.Name.Trim();
        if (request.Email != null) c.Email = request.Email;
        await _clients.UpdateAsync(c, ct);
        return true;
    }
}
