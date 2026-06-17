using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class Goal : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; } = 0;
    public DateOnly? TargetDate { get; set; }
    public string? ImageUrl { get; set; }
    public GoalStatus Status { get; set; } = GoalStatus.Active;
    public DateTime? CompletedAt { get; set; }

    public decimal PercentageComplete =>
        TargetAmount == 0 ? 0 : Math.Min(100, Math.Round(CurrentAmount / TargetAmount * 100, 2));
    public decimal RemainingAmount => Math.Max(0, TargetAmount - CurrentAmount);
    public bool IsCompleted => CurrentAmount >= TargetAmount;

    public ICollection<GoalContribution> Contributions { get; set; } = new List<GoalContribution>();

    public void AddContribution(decimal amount, Guid userId, string? notes = null)
    {
        CurrentAmount += amount;
        Contributions.Add(new GoalContribution
        {
            TenantId = TenantId,
            GoalId   = Id,
            Amount   = amount,
            UserId   = userId,
            Notes    = notes
        });
        if (IsCompleted && Status == GoalStatus.Active)
        {
            Status      = GoalStatus.Completed;
            CompletedAt = DateTime.UtcNow;
        }
    }
}

public class GoalContribution : BaseEntity
{
    public Guid GoalId { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
    public DateTime ContributedAt { get; set; } = DateTime.UtcNow;
    public Guid UserId { get; set; }

    public Goal? Goal { get; set; }
}
