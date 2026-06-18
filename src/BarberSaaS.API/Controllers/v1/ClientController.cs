using BarberSaaS.Application.ClientPortal.Commands;
using BarberSaaS.Application.ClientPortal.Queries;
using BarberSaaS.Application.Common.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Área do cliente autenticado por telefone/OTP. Todas as rotas usam o id do
/// próprio cliente (claim `sub`) — um cliente só acessa os próprios dados.
/// </summary>
[ApiController]
[Route("api/v1/client")]
[Authorize(Policy = "RequireClient")]
public class ClientController : ControllerBase
{
    private readonly IMediator _mediator;

    public ClientController(IMediator mediator) => _mediator = mediator;

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var profile = await _mediator.Send(new GetMyProfileQuery(), ct);
        return profile is null ? NotFound() : Ok(ApiResponse<MyProfileDto>.Ok(profile));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateMyProfileCommand command, CancellationToken ct)
    {
        var updated = await _mediator.Send(command, ct);
        return updated ? Ok(ApiResponse<bool>.Ok(true, "Perfil atualizado.")) : NotFound();
    }

    [HttpGet("appointments")]
    public async Task<IActionResult> MyAppointments(CancellationToken ct)
    {
        var list = await _mediator.Send(new GetMyAppointmentsQuery(), ct);
        return Ok(ApiResponse<IReadOnlyList<MyAppointmentDto>>.Ok(list));
    }
}
