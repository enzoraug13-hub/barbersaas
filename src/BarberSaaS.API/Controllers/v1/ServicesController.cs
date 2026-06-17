using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Services.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class ServicesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;
    private readonly IServiceRepository _services;

    public ServicesController(IMediator mediator, ICurrentTenant tenant, IServiceRepository services)
    {
        _mediator = mediator; _tenant = tenant; _services = services;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await _services.GetActiveByTenantAsync(_tenant.Id, ct);
        return Ok(ApiResponse<object>.Ok(list.Select(s => new ServiceDto(s.Id, s.Name, s.Description, s.DurationMinutes, s.Price, s.ColorHex, s.IsActive, s.ShowInPublicPage, s.DisplayOrder))));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceCommand command, CancellationToken ct)
    {
        var cmd = command with { TenantId = _tenant.Id };
        var result = await _mediator.Send(cmd, ct);
        return Ok(ApiResponse<ServiceDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceRequest request, CancellationToken ct)
    {
        var service = await _services.GetByIdAsync(id, ct);
        if (service == null) return NotFound();
        service.Name            = request.Name;
        service.Description     = request.Description;
        service.DurationMinutes = request.DurationMinutes;
        service.Price           = request.Price;
        service.ColorHex        = request.ColorHex;
        service.ShowInPublicPage = request.ShowInPublicPage;
        await _services.UpdateAsync(service, ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var service = await _services.GetByIdAsync(id, ct);
        if (service == null) return NotFound();
        await _services.DeleteAsync(service, ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }
}

public record UpdateServiceRequest(string Name, string? Description, int DurationMinutes, decimal Price, string? ColorHex, bool ShowInPublicPage);
