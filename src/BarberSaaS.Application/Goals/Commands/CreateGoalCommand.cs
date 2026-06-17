using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Goals.Commands;

public record CreateGoalCommand(Guid TenantId, string Name, string? Description, decimal TargetAmount, DateOnly? TargetDate, string? ImageUrl) : IRequest<GoalDto>;

public record GoalDto(Guid Id, string Name, string? Description, decimal TargetAmount, decimal CurrentAmount, decimal PercentageComplete, decimal RemainingAmount, DateOnly? TargetDate, string Status, bool IsCompleted);

public record AddContributionCommand(Guid TenantId, Guid GoalId, decimal Amount, Guid UserId, string? Notes) : IRequest<GoalDto>;

public class CreateGoalValidator : AbstractValidator<CreateGoalCommand>
{
    public CreateGoalValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TargetAmount).GreaterThan(0);
    }
}

public class CreateGoalHandler : IRequestHandler<CreateGoalCommand, GoalDto>
{
    private readonly IGoalRepository _goals;
    public CreateGoalHandler(IGoalRepository goals) => _goals = goals;

    public async Task<GoalDto> Handle(CreateGoalCommand request, CancellationToken ct)
    {
        var goal = new Goal
        {
            TenantId     = request.TenantId,
            Name         = request.Name,
            Description  = request.Description,
            TargetAmount = request.TargetAmount,
            TargetDate   = request.TargetDate,
            ImageUrl     = request.ImageUrl
        };
        await _goals.AddAsync(goal, ct);
        return MapDto(goal);
    }

    private static GoalDto MapDto(Goal g) => new(g.Id, g.Name, g.Description, g.TargetAmount, g.CurrentAmount, g.PercentageComplete, g.RemainingAmount, g.TargetDate, g.Status.ToString(), g.IsCompleted);
}

public class AddContributionHandler : IRequestHandler<AddContributionCommand, GoalDto>
{
    private readonly IGoalRepository _goals;
    public AddContributionHandler(IGoalRepository goals) => _goals = goals;

    public async Task<GoalDto> Handle(AddContributionCommand request, CancellationToken ct)
    {
        var goal = await _goals.GetByIdAsync(request.GoalId, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.EntityNotFoundException("Meta", request.GoalId);
        goal.AddContribution(request.Amount, request.UserId, request.Notes);
        await _goals.UpdateAsync(goal, ct);
        return new GoalDto(goal.Id, goal.Name, goal.Description, goal.TargetAmount, goal.CurrentAmount, goal.PercentageComplete, goal.RemainingAmount, goal.TargetDate, goal.Status.ToString(), goal.IsCompleted);
    }
}
