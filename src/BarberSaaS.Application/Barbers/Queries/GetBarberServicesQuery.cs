using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.Barbers.Queries;

// Lista TODOS os serviços ativos do tenant marcando, para este barbeiro, se há
// vínculo explícito (BarberService) e qual o preço efetivo. Modelo permissivo
// (ver Parte A): sem vínculo, o serviço continua agendável pelo preço base —
// por isso o GET devolve oferecidos E não-oferecidos, todos com effectivePrice.
public record GetBarberServicesQuery(Guid TenantId, Guid BarberId)
    : IRequest<IReadOnlyList<BarberServiceItemDto>>;

// Shape compartilhado pelo GET e pelos comandos de upsert/lote (saída).
//   IsOffered      = existe linha BarberService p/ (barbeiro, serviço)
//   CustomPrice    = preço próprio (pode ser null mesmo oferecido = "oferece pelo preço base")
//   EffectivePrice = CustomPrice ?? BasePrice  (o que o agendamento cobraria hoje — igual à Parte A)
public record BarberServiceItemDto(
    Guid ServiceId,
    string ServiceName,
    decimal BasePrice,
    bool IsOffered,
    decimal? CustomPrice,
    decimal EffectivePrice);

public class GetBarberServicesHandler : IRequestHandler<GetBarberServicesQuery, IReadOnlyList<BarberServiceItemDto>>
{
    private readonly IBarberRepository _barbers;
    private readonly IServiceRepository _services;
    private readonly IBarberServiceRepository _barberServices;

    public GetBarberServicesHandler(IBarberRepository barbers, IServiceRepository services, IBarberServiceRepository barberServices)
    {
        _barbers = barbers; _services = services; _barberServices = barberServices;
    }

    public async Task<IReadOnlyList<BarberServiceItemDto>> Handle(GetBarberServicesQuery request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");
        // GetByIdAsync já respeita o filtro de tenant; defesa explícita extra.
        if (barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        var services = await _services.GetActiveByTenantAsync(request.TenantId, ct);
        var links    = await _barberServices.GetByBarberAsync(request.TenantId, request.BarberId, ct);
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
