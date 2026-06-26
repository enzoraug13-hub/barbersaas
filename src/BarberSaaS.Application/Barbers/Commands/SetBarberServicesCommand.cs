using BarberSaaS.Application.Barbers.Queries;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

// Substitui o conjunto inteiro de vínculos do barbeiro (PUT /barbers/{id}/services).
// O lote vira a verdade: serviços novos -> INSERT, existentes -> UPDATE, ausentes -> DELETE,
// tudo numa única transação. Retorna a lista completa atualizada (mesmo shape do GET).
public record SetBarberServicesCommand(Guid TenantId, Guid BarberId, IReadOnlyList<BarberServiceInput> Services)
    : IRequest<IReadOnlyList<BarberServiceItemDto>>;

public record BarberServiceInput(Guid ServiceId, decimal? CustomPrice);

public class SetBarberServicesValidator : AbstractValidator<SetBarberServicesCommand>
{
    public SetBarberServicesValidator()
    {
        RuleFor(x => x.BarberId).NotEmpty();
        RuleFor(x => x.Services).NotNull();

        RuleForEach(x => x.Services).ChildRules(item =>
        {
            item.RuleFor(i => i.ServiceId).NotEmpty();
            item.When(i => i.CustomPrice.HasValue, () =>
                item.RuleFor(i => i.CustomPrice!.Value).GreaterThan(0)
                    .WithMessage("O preço próprio deve ser maior que zero."));
        });

        // Dedupe: o mesmo serviceId não pode aparecer duas vezes no lote (ambiguidade de preço).
        RuleFor(x => x.Services)
            .Must(list => list == null || list.Select(s => s.ServiceId).Distinct().Count() == list.Count)
            .WithMessage("ServiceId duplicado no lote.");
    }
}

public class SetBarberServicesHandler : IRequestHandler<SetBarberServicesCommand, IReadOnlyList<BarberServiceItemDto>>
{
    private readonly IBarberRepository _barbers;
    private readonly IServiceRepository _services;
    private readonly IBarberServiceRepository _barberServices;

    public SetBarberServicesHandler(IBarberRepository barbers, IServiceRepository services, IBarberServiceRepository barberServices)
    {
        _barbers = barbers; _services = services; _barberServices = barberServices;
    }

    public async Task<IReadOnlyList<BarberServiceItemDto>> Handle(SetBarberServicesCommand request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");
        if (barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        var services = await _services.GetActiveByTenantAsync(request.TenantId, ct);
        var validIds = services.Select(s => s.Id).ToHashSet();

        // Todo serviço do lote precisa ser um serviço ativo deste tenant.
        foreach (var item in request.Services)
            if (!validIds.Contains(item.ServiceId))
                throw new DomainException("Serviço inválido para esta barbearia.");

        await _barberServices.ReplaceSetAsync(request.TenantId, request.BarberId,
            request.Services.Select(s => (s.ServiceId, s.CustomPrice)).ToList(), ct);

        // Devolve a lista completa (oferecidos e não-oferecidos), igual ao GET.
        var links = await _barberServices.GetByBarberAsync(request.TenantId, request.BarberId, ct);
        var customByService = links.ToDictionary(l => l.ServiceId, l => l.CustomPrice);

        return services.Select(s =>
        {
            var offered = customByService.TryGetValue(s.Id, out var custom);
            return new BarberServiceItemDto(
                s.Id, s.Name, s.Price, offered,
                offered ? custom : null,
                (offered ? custom : null) ?? s.Price);
        }).ToList();
    }
}
