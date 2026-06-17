using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Settings.Commands;
using BarberSaaS.Application.Settings.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwner")]
public class SettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SettingsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var settings = await _mediator.Send(new GetSettingsQuery(), ct);
        return settings is null ? NotFound() : Ok(ApiResponse<SettingsDto>.Ok(settings));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSettingsCommand command, CancellationToken ct)
    {
        var updated = await _mediator.Send(command, ct);
        return updated
            ? Ok(ApiResponse<bool>.Ok(true, "Configurações atualizadas."))
            : NotFound();
    }
}
