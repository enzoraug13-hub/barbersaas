using BarberSaaS.Application.Barbers.Commands;
using BarberSaaS.Application.Barbers.Queries;
using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class BarbersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;
    private readonly IBarberRepository _barbers;
    private readonly IConfiguration _config;

    public BarbersController(IMediator mediator, ICurrentTenant tenant, IBarberRepository barbers, IConfiguration config)
    {
        _mediator = mediator; _tenant = tenant; _barbers = barbers; _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var barbers = await _barbers.GetActiveByTenantAsync(_tenant.Id, ct);
        return Ok(ApiResponse<object>.Ok(barbers.Select(b => new BarberDto(b.Id, b.Name, b.PhotoUrl, b.Bio, b.Phone, b.IsActive, b.ShowInPublicPage, b.GoogleCalendarId, b.DisplayOrder, (int)b.CommissionType, b.CommissionValue))));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var b = await _barbers.GetByIdAsync(id, ct);
        if (b == null || b.TenantId != _tenant.Id) return NotFound();
        return Ok(ApiResponse<BarberDto>.Ok(new BarberDto(b.Id, b.Name, b.PhotoUrl, b.Bio, b.Phone,
            b.IsActive, b.ShowInPublicPage, b.GoogleCalendarId, b.DisplayOrder, (int)b.CommissionType, b.CommissionValue)));
    }

    // Série temporal mensal de desempenho do barbeiro (gráfico do perfil — Parte D).
    [HttpGet("{id:guid}/performance")]
    public async Task<IActionResult> GetPerformance(Guid id, [FromQuery] int months, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetBarberPerformanceSeriesQuery(_tenant.Id, id, months <= 0 ? 6 : months), ct);
        return Ok(ApiResponse<IReadOnlyList<BarberMonthlyPointDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBarberCommand command, CancellationToken ct)
    {
        var cmd = command with { TenantId = _tenant.Id };
        var result = await _mediator.Send(cmd, ct);
        return Ok(ApiResponse<BarberDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBarberRequest body, CancellationToken ct)
    {
        var cmd = new UpdateBarberCommand(_tenant.Id, id, body.Name, body.PhotoUrl, body.Bio, body.Phone,
            body.CommissionType, body.CommissionValue, body.ShowInPublicPage, body.DisplayOrder);
        var result = await _mediator.Send(cmd, ct);
        return Ok(ApiResponse<BarberDto>.Ok(result, "Barbeiro atualizado."));
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(id, ct);
        if (barber == null) return NotFound();
        barber.IsActive = !barber.IsActive;
        await _barbers.UpdateAsync(barber, ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpGet("{id:guid}/schedule")]
    public async Task<IActionResult> GetSchedule(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetWorkScheduleQuery(id), ct);
        return Ok(ApiResponse<WorkScheduleDto?>.Ok(result));
    }

    [HttpPut("{id:guid}/schedule")]
    public async Task<IActionResult> UpdateSchedule(Guid id, [FromBody] UpdateWorkScheduleCommand body, CancellationToken ct)
    {
        await _mediator.Send(body with { BarberId = id }, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Horários atualizados."));
    }

    // --- Google Calendar (OAuth por barbeiro) ---

    // Devolve a URL de consentimento em JSON (em vez de 302) porque o redirect do
    // navegador não carrega o Bearer token — o front faz window.location.href = url.
    [HttpGet("{id:guid}/google/connect")]
    public async Task<IActionResult> GoogleConnect(Guid id, CancellationToken ct)
    {
        var url = await _mediator.Send(new GetGoogleConnectUrlQuery(_tenant.Id, id), ct);
        return Ok(ApiResponse<object>.Ok(new { url }));
    }

    [HttpGet("{id:guid}/google/status")]
    public async Task<IActionResult> GoogleStatus(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetGoogleStatusQuery(_tenant.Id, id), ct);
        return Ok(ApiResponse<GoogleConnectionStatus>.Ok(result));
    }

    [HttpDelete("{id:guid}/google")]
    public async Task<IActionResult> GoogleDisconnect(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DisconnectGoogleCommand(_tenant.Id, id), ct);
        return Ok(ApiResponse<bool>.Ok(true, "Google Calendar desconectado."));
    }

    // Callback do consentimento: o GOOGLE redireciona o navegador para cá, sem JWT —
    // a autorização vem do state cifrado/assinado (tenant+barbeiro, validade 10 min).
    // Sempre termina em redirect para o painel, com ?google=connected|error.
    [AllowAnonymous]
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken ct)
    {
        var frontendUrl = (_config["App:FrontendUrl"] ?? "").TrimEnd('/');

        // error=access_denied: usuário cancelou a tela de consentimento.
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return Redirect($"{frontendUrl}/admin/barbeiros?google=error");

        var result = await _mediator.Send(new CompleteGoogleCallbackCommand(code, state), ct);
        var target = result.BarberId != null
            ? $"{frontendUrl}/admin/barbeiros/{result.BarberId}"
            : $"{frontendUrl}/admin/barbeiros";
        return Redirect($"{target}?google={(result.Success ? "connected" : "error")}");
    }

    // --- Serviços/preços por barbeiro (Parte B) ---

    // Lista todos os serviços do tenant marcando oferecidos/não-oferecidos + preço efetivo.
    [HttpGet("{id:guid}/services")]
    public async Task<IActionResult> GetServices(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetBarberServicesQuery(_tenant.Id, id), ct);
        return Ok(ApiResponse<IReadOnlyList<BarberServiceItemDto>>.Ok(result));
    }

    // Upsert unitário do vínculo (cria ou edita o preço próprio).
    [HttpPut("{id:guid}/services/{serviceId:guid}")]
    public async Task<IActionResult> UpsertService(Guid id, Guid serviceId, [FromBody] UpsertBarberServiceRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpsertBarberServiceCommand(_tenant.Id, id, serviceId, body.CustomPrice), ct);
        return Ok(ApiResponse<BarberServiceItemDto>.Ok(result, "Serviço do barbeiro atualizado."));
    }

    // Desvincula o serviço (volta ao preço base).
    [HttpDelete("{id:guid}/services/{serviceId:guid}")]
    public async Task<IActionResult> RemoveService(Guid id, Guid serviceId, CancellationToken ct)
    {
        var removed = await _mediator.Send(new RemoveBarberServiceCommand(_tenant.Id, id, serviceId), ct);
        return Ok(ApiResponse<bool>.Ok(removed, removed ? "Vínculo removido." : "Não havia vínculo."));
    }

    // Substitui o conjunto inteiro de vínculos do barbeiro (add+update+remove numa transação).
    [HttpPut("{id:guid}/services")]
    public async Task<IActionResult> SetServices(Guid id, [FromBody] SetBarberServicesRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new SetBarberServicesCommand(_tenant.Id, id, body.Services), ct);
        return Ok(ApiResponse<IReadOnlyList<BarberServiceItemDto>>.Ok(result, "Serviços do barbeiro atualizados."));
    }
}

public record UpdateBarberRequest(
    string Name,
    string? PhotoUrl,
    string? Bio,
    string? Phone,
    CommissionType CommissionType,
    decimal CommissionValue,
    bool ShowInPublicPage,
    int DisplayOrder);

public record UpsertBarberServiceRequest(decimal? CustomPrice);
public record SetBarberServicesRequest(IReadOnlyList<BarberServiceInput> Services);
