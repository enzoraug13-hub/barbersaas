using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Goals.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class GoalsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;
    private readonly ICurrentUser _user;
    private readonly IGoalRepository _goals;

    public GoalsController(IMediator mediator, ICurrentTenant tenant, ICurrentUser user, IGoalRepository goals)
    {
        _mediator = mediator; _tenant = tenant; _user = user; _goals = goals;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await _goals.GetAllByTenantAsync(_tenant.Id, ct);
        return Ok(ApiResponse<object>.Ok(list.Select(g => new GoalDto(g.Id, g.Name, g.Description, g.TargetAmount, g.CurrentAmount, g.PercentageComplete, g.RemainingAmount, g.TargetDate, g.Status.ToString(), g.IsCompleted))));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalCommand command, CancellationToken ct)
    {
        var cmd = command with { TenantId = _tenant.Id };
        var result = await _mediator.Send(cmd, ct);
        return Ok(ApiResponse<GoalDto>.Ok(result));
    }

    [HttpPost("{id:guid}/contribute")]
    public async Task<IActionResult> Contribute(Guid id, [FromBody] ContributeRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new AddContributionCommand(_tenant.Id, id, request.Amount, _user.Id, request.Notes), ct);
        return Ok(ApiResponse<GoalDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGoalRequest request, CancellationToken ct)
    {
        var cmd = new UpdateGoalCommand(_tenant.Id, id, request.Name, request.Description, request.TargetAmount, request.TargetDate, request.ImageUrl);
        var result = await _mediator.Send(cmd, ct);
        return Ok(ApiResponse<GoalDto>.Ok(result));
    }
}

public record ContributeRequest(decimal Amount, string? Notes);
public record UpdateGoalRequest(string Name, string? Description, decimal TargetAmount, DateOnly? TargetDate, string? ImageUrl);
