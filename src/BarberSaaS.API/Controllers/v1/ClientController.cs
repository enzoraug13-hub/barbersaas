using BarberSaaS.Application.Appointments.Commands.CreateAppointment;
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

    // Fidelidade: programa+saldo+catálogo+meus resgates numa chamada. Programa
    // desligado → enabled:false e o front esconde a seção.
    [HttpGet("loyalty")]
    public async Task<IActionResult> MyLoyalty(CancellationToken ct)
        => Ok(ApiResponse<MyLoyaltyDto>.Ok(await _mediator.Send(new GetMyLoyaltyQuery(), ct)));

    [HttpPost("loyalty/redeem")]
    public async Task<IActionResult> Redeem([FromBody] RedeemRewardCommand command, CancellationToken ct)
        => Ok(ApiResponse<Guid>.Ok(await _mediator.Send(command, ct),
            "Resgate solicitado! A barbearia foi avisada."));

    // Confirma o agendamento reservado no fluxo público (POST /public/{slug}/reserve).
    // Exige perfil completo (nome+CPF) — ver IRequireCompleteClientProfile.
    [HttpPost("appointments")]
    public async Task<IActionResult> ConfirmAppointment([FromBody] ConfirmAppointmentCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return Ok(ApiResponse<AppointmentResultDto>.Ok(result, "Agendamento realizado com sucesso!"));
    }
}
