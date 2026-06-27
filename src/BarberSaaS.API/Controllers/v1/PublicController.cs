using BarberSaaS.Application.Appointments.Commands.ReserveSlot;
using BarberSaaS.Application.Appointments.Queries.GetAvailableSlots;
using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Settings.Queries;
using BarberSaaS.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/public")]
public class PublicController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ITenantRepository _tenants;

    public PublicController(IMediator mediator, ITenantRepository tenants)
    {
        _mediator = mediator; _tenants = tenants;
    }

    // Resolve o tenant pelo slug (fluxo público, sem JWT). Centraliza a checagem
    // que antes estava repetida em todas as ações.
    private async Task<(Tenant? tenant, IActionResult? error)> ResolveTenantAsync(string slug, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(slug, ct);
        return tenant is null ? (null, NotFound()) : (tenant, null);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetPublicPage(string slug, CancellationToken ct)
    {
        var (tenant, error) = await ResolveTenantAsync(slug, ct);
        if (error != null) return error;
        if (!tenant!.IsActive) return NotFound();

        return Ok(ApiResponse<object>.Ok(new
        {
            TenantId    = tenant.Id,
            BusinessName = tenant.Settings?.BusinessName,
            Description  = tenant.Settings?.Description,
            LogoUrl      = tenant.Settings?.LogoUrl,
            CoverImageUrl = tenant.Settings?.CoverImageUrl,
            PrimaryColor   = tenant.Settings?.PrimaryColor ?? "#1a1a1a",
            SecondaryColor = tenant.Settings?.SecondaryColor ?? "#c9a84c",
            AccentColor    = tenant.Settings?.AccentColor ?? "#ffffff",
            Phone        = tenant.Settings?.Phone,
            InstagramUrl = tenant.Settings?.InstagramUrl,
            WhatsAppNumber = tenant.Settings?.WhatsAppNumber,
            Address      = tenant.Settings?.Address,
            City         = tenant.Settings?.City,
            BusinessHours = GetSettingsHandler.ParseBusinessHours(tenant.Settings?.BusinessHoursJson)
        }));
    }

    [HttpGet("{slug}/barbers")]
    public async Task<IActionResult> GetBarbers(string slug, [FromServices] IBarberRepository barbers, CancellationToken ct)
    {
        var (tenant, error) = await ResolveTenantAsync(slug, ct);
        if (error != null) return error;

        var list = await barbers.GetShowInPublicPageAsync(tenant!.Id, ct);
        return Ok(ApiResponse<object>.Ok(list.Select(b => new
        {
            b.Id, b.Name, b.PhotoUrl, b.Bio, b.DisplayOrder
        })));
    }

    [HttpGet("{slug}/services")]
    public async Task<IActionResult> GetServices(
        string slug,
        [FromQuery] Guid? barberId,
        [FromServices] IServiceRepository services,
        [FromServices] IBarberRepository barbers,
        [FromServices] IBarberServiceRepository barberServices,
        CancellationToken ct)
    {
        var (tenant, error) = await ResolveTenantAsync(slug, ct);
        if (error != null) return error;

        var list = await services.GetPublicByTenantAsync(tenant!.Id, ct);

        // Preço por barbeiro: só quando o tenant habilitou E veio um barberId válido
        // do MESMO tenant (defesa-em-profundidade — fluxo público roda sem filtro global).
        // Sem isso, cai no preço base (permissivo, como antes).
        Dictionary<Guid, decimal>? customByService = null;
        if (tenant.Settings?.CustomPriceEnabled == true && barberId is { } bid && bid != Guid.Empty)
        {
            var barber = await barbers.GetByIdAsync(bid, ct);
            if (barber is not null && barber.TenantId == tenant.Id)
            {
                var links = await barberServices.GetByBarberAsync(tenant.Id, bid, ct);
                customByService = links
                    .Where(l => l.CustomPrice.HasValue)
                    .ToDictionary(l => l.ServiceId, l => l.CustomPrice!.Value);
            }
        }

        return Ok(ApiResponse<object>.Ok(list.Select(s => new
        {
            s.Id, s.Name, s.Description, s.DurationMinutes, s.Price, s.ColorHex,
            EffectivePrice = customByService is not null && customByService.TryGetValue(s.Id, out var cp) ? cp : s.Price
        })));
    }

    [HttpGet("{slug}/slots")]
    public async Task<IActionResult> GetSlots(string slug, [FromQuery] Guid barberId, [FromQuery] Guid serviceId, [FromQuery] DateOnly date, CancellationToken ct)
    {
        var (tenant, error) = await ResolveTenantAsync(slug, ct);
        if (error != null) return error;

        var result = await _mediator.Send(new GetAvailableSlotsQuery(barberId, serviceId, date, tenant!.Id), ct);
        return Ok(ApiResponse<IReadOnlyList<SlotDto>>.Ok(result));
    }

    [HttpPost("{slug}/reserve")]
    [EnableRateLimiting("booking")]
    public async Task<IActionResult> ReserveSlot(string slug, [FromBody] ReserveSlotRequest request, CancellationToken ct)
    {
        var (tenant, error) = await ResolveTenantAsync(slug, ct);
        if (error != null) return error;
        if (tenant!.Settings?.AllowOnlineBooking == false)
            return BadRequest(ApiResponse<object>.Fail("Agendamento online desabilitado."));

        var command = new ReserveSlotCommand(tenant.Id, request.BarberId, request.ServiceId, request.Date, request.StartTime);
        var result = await _mediator.Send(command, ct);
        return Ok(ApiResponse<ReserveSlotResultDto>.Ok(result));
    }

}

public record ReserveSlotRequest(Guid BarberId, Guid ServiceId, DateOnly Date, TimeOnly StartTime);
