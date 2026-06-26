using BarberSaaS.Application.Barbers.Queries;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

// Upsert unitário do vínculo barbeiro↔serviço (PUT /barbers/{id}/services/{serviceId}).
// CustomPrice null = "oferece pelo preço base" (vínculo existe, sem preço próprio).
public record UpsertBarberServiceCommand(Guid TenantId, Guid BarberId, Guid ServiceId, decimal? CustomPrice)
    : IRequest<BarberServiceItemDto>;

public class UpsertBarberServiceValidator : AbstractValidator<UpsertBarberServiceCommand>
{
    public UpsertBarberServiceValidator()
    {
        RuleFor(x => x.BarberId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        // Preço próprio, quando informado, precisa ser > 0. Null é válido (preço base).
        When(x => x.CustomPrice.HasValue, () =>
            RuleFor(x => x.CustomPrice!.Value).GreaterThan(0)
                .WithMessage("O preço próprio deve ser maior que zero."));
    }
}

public class UpsertBarberServiceHandler : IRequestHandler<UpsertBarberServiceCommand, BarberServiceItemDto>
{
    private readonly IBarberRepository _barbers;
    private readonly IServiceRepository _services;
    private readonly IBarberServiceRepository _barberServices;

    public UpsertBarberServiceHandler(IBarberRepository barbers, IServiceRepository services, IBarberServiceRepository barberServices)
    {
        _barbers = barbers; _services = services; _barberServices = barberServices;
    }

    public async Task<BarberServiceItemDto> Handle(UpsertBarberServiceCommand request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");
        if (barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        var service = await _services.GetByIdAsync(request.ServiceId, ct)
            ?? throw new DomainException("Serviço não encontrado.");
        if (service.TenantId != request.TenantId)
            throw new DomainException("Serviço não encontrado.");

        await _barberServices.UpsertAsync(request.TenantId, request.BarberId, request.ServiceId, request.CustomPrice, ct);

        return new BarberServiceItemDto(
            service.Id, service.Name, service.Price, true,
            request.CustomPrice, request.CustomPrice ?? service.Price);
    }
}
