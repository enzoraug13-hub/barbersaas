using BarberSaaS.Application.Barbers.Commands;
using BarberSaaS.Application.Barbers.Queries;
using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class BarbersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;
    private readonly IBarberRepository _barbers;

    public BarbersController(IMediator mediator, ICurrentTenant tenant, IBarberRepository barbers)
    {
        _mediator = mediator; _tenant = tenant; _barbers = barbers;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var barbers = await _barbers.GetActiveByTenantAsync(_tenant.Id, ct);
        return Ok(ApiResponse<object>.Ok(barbers.Select(b => new BarberDto(b.Id, b.Name, b.PhotoUrl, b.Bio, b.Phone, b.IsActive, b.ShowInPublicPage, b.GoogleCalendarId, b.DisplayOrder))));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBarberCommand command, CancellationToken ct)
    {
        var cmd = command with { TenantId = _tenant.Id };
        var result = await _mediator.Send(cmd, ct);
        return Ok(ApiResponse<BarberDto>.Ok(result));
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
}
