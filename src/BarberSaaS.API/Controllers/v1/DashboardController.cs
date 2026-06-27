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

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthly([FromQuery] int months, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMonthlyRevenueQuery(_tenant.Id, months <= 0 ? 6 : months), ct);
        return Ok(ApiResponse<IReadOnlyList<MonthlyRevenueDto>>.Ok(result));
    }

    [HttpGet("by-barber")]
    public async Task<IActionResult> GetByBarber([FromQuery] DateOnly? start, [FromQuery] DateOnly? end, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var s     = start ?? today.AddDays(-6);
        var e     = end   ?? today;
        var result = await _mediator.Send(new GetBarberPerformanceQuery(_tenant.Id, s, e), ct);
        return Ok(ApiResponse<IReadOnlyList<BarberPerformanceDto>>.Ok(result));
    }

    [HttpGet("payment-methods")]
    public async Task<IActionResult> GetPaymentMethods([FromQuery] DateOnly? start, [FromQuery] DateOnly? end, CancellationToken ct)
    {
        var today  = DateOnly.FromDateTime(DateTime.UtcNow);
        var s      = start ?? new DateOnly(today.Year, today.Month, 1);
        var e      = end   ?? today;
        var result = await _mediator.Send(new GetPaymentMethodsQuery(_tenant.Id, s, e), ct);
        return Ok(ApiResponse<PaymentMethodsDto>.Ok(result));
    }
}
