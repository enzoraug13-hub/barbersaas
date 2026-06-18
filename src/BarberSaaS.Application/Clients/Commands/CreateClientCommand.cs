using BarberSaaS.Application.Clients.Queries;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Clients.Commands;

// Retorna null quando o telefone já existe (controller mapeia para 409 Conflict).
public record CreateClientCommand(string Name, string Phone, string? Email) : IRequest<ClientListItemDto?>;

public class CreateClientValidator : AbstractValidator<CreateClientCommand>
{
    public CreateClientValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Phone).NotEmpty();
    }
}

public class CreateClientHandler : IRequestHandler<CreateClientCommand, ClientListItemDto?>
{
    private readonly IClientRepository _clients;
    private readonly ICurrentTenant _tenant;

    public CreateClientHandler(IClientRepository clients, ICurrentTenant tenant)
    {
        _clients = clients; _tenant = tenant;
    }

    public async Task<ClientListItemDto?> Handle(CreateClientCommand request, CancellationToken ct)
    {
        if (await _clients.PhoneExistsAsync(request.Phone, _tenant.Id, ct))
            return null;

        var client = new Client
        {
            Name        = request.Name,
            PhoneNumber = request.Phone,
            Email       = request.Email,
        };
        await _clients.AddAsync(client, ct);

        return new ClientListItemDto(
            client.Id, client.Name, client.PhoneNumber, client.Email,
            client.TotalVisits, client.LastVisitAt, client.LoyaltyPoints, client.IsBlocked);
    }
}
