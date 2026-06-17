using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Dashboard.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;

    public DashboardController(IMediator mediator, ICurrentTenant tenant)
    {
        _mediator = mediator; _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateOnly? start, [FromQuery] DateOnly? end, CancellationToken ct)
    {
        var today  = DateOnly.FromDateTime(DateTime.UtcNow);
        var s      = start ?? new DateOnly(today.Year, today.Month, 1);
        var e      = end   ?? today;
        var result = await _mediator.Send(new GetDashboardQuery(_tenant.Id, s, e), ct);
        return Ok(ApiResponse<DashboardDto>.Ok(result));
    }
}
