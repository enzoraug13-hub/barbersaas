using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

// Desvincula o serviço do barbeiro (DELETE /barbers/{id}/services/{serviceId}).
// Idempotente: retorna false se não havia vínculo (o serviço volta ao preço base).
public record RemoveBarberServiceCommand(Guid TenantId, Guid BarberId, Guid ServiceId) : IRequest<bool>;

public class RemoveBarberServiceHandler : IRequestHandler<RemoveBarberServiceCommand, bool>
{
    private readonly IBarberRepository _barbers;
    private readonly IBarberServiceRepository _barberServices;

    public RemoveBarberServiceHandler(IBarberRepository barbers, IBarberServiceRepository barberServices)
    {
        _barbers = barbers; _barberServices = barberServices;
    }

    public async Task<bool> Handle(RemoveBarberServiceCommand request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");
        if (barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        return await _barberServices.RemoveAsync(request.TenantId, request.BarberId, request.ServiceId, ct);
    }
}
