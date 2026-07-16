using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Loyalty.Commands;
using BarberSaaS.Application.Loyalty.Queries;
using BarberSaaS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Programa de fidelidade — visão do dono. Leituras liberadas para admin (a tela de
/// Clientes e a sidebar precisam saber se o programa está ligado); mutações só Owner.
/// Tenant sempre do JWT (filtro global do EF).
/// </summary>
[ApiController]
[Route("api/v1/loyalty")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class LoyaltyController : ControllerBase
{
    private readonly IMediator _mediator;
    public LoyaltyController(IMediator mediator) => _mediator = mediator;

    // ---- programa ----

    [HttpGet("program")]
    public async Task<IActionResult> GetProgram(CancellationToken ct)
        => Ok(ApiResponse<LoyaltyProgramDto>.Ok(await _mediator.Send(new GetLoyaltyProgramQuery(), ct)));

    [HttpPut("program")]
    [Authorize(Policy = "RequireOwner")]
    public async Task<IActionResult> UpdateProgram([FromBody] UpdateLoyaltyProgramCommand command, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(await _mediator.Send(command, ct), "Programa de fidelidade atualizado."));

    // ---- catálogo ----

    [HttpGet("rewards")]
    public async Task<IActionResult> GetRewards([FromQuery] bool onlyActive, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<LoyaltyRewardDto>>.Ok(
            await _mediator.Send(new GetLoyaltyRewardsQuery(onlyActive), ct)));

    [HttpPost("rewards")]
    [Authorize(Policy = "RequireOwner")]
    public async Task<IActionResult> CreateReward([FromBody] SaveLoyaltyRewardCommand command, CancellationToken ct)
        => Ok(ApiResponse<Guid>.Ok(await _mediator.Send(command with { Id = null }, ct), "Recompensa criada."));

    [HttpPut("rewards/{id:guid}")]
    [Authorize(Policy = "RequireOwner")]
    public async Task<IActionResult> UpdateReward(Guid id, [FromBody] SaveLoyaltyRewardCommand command, CancellationToken ct)
        => Ok(ApiResponse<Guid>.Ok(await _mediator.Send(command with { Id = id }, ct), "Recompensa atualizada."));

    // ---- saldos ----

    [HttpGet("balances")]
    public async Task<IActionResult> GetBalances(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ClientBalanceRow>>.Ok(
            await _mediator.Send(new GetLoyaltyBalancesQuery(), ct)));

    // ---- resgates ----

    [HttpGet("redemptions")]
    public async Task<IActionResult> GetRedemptions([FromQuery] LoyaltyRedemptionStatus? status, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<RedemptionDto>>.Ok(
            await _mediator.Send(new GetLoyaltyRedemptionsQuery(status), ct)));

    [HttpPost("redemptions/{id:guid}/deliver")]
    public async Task<IActionResult> Deliver(Guid id, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(await _mediator.Send(new ResolveRedemptionCommand(id, Deliver: true), ct),
            "Resgate marcado como entregue."));

    [HttpPost("redemptions/{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(await _mediator.Send(new ResolveRedemptionCommand(id, Deliver: false), ct),
            "Resgate cancelado — pontos devolvidos ao cliente."));
}
