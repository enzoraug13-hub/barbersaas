using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MonthlyPrice { get; set; } = 0;
    public decimal YearlyPrice { get; set; } = 0;
    public int MaxBarbers { get; set; } = 1;
    public int MaxAdmins { get; set; } = 1;
    public int? MaxAppointmentsPerMonth { get; set; }
    public int? MaxServices { get; set; }
    public int? MaxProducts { get; set; }
    public string Features { get; set; } = "{}";
    public bool IsActive { get; set; } = true;
    public bool IsPublic { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;
}

public class Subscription : BaseEntity
{
    public Guid PlanId { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
    public DateOnly CurrentPeriodStart { get; set; }
    public DateOnly CurrentPeriodEnd { get; set; }
    public DateOnly? TrialEndsAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public string? ExternalCustomerId { get; set; }
    public string? ExternalSubId { get; set; }

    public Plan? Plan { get; set; }
    public Tenant? Tenant { get; set; }
    public ICollection<SubscriptionPayment> Payments { get; set; } = new List<SubscriptionPayment>();
}

public class SubscriptionPayment : BaseEntity
{
    public Guid SubscriptionId { get; set; }
    public Guid PlanId { get; set; }
    public decimal Amount { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public string? PaymentMethod { get; set; }
    public string? ExternalPaymentId { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? FailureReason { get; set; }

    public Subscription? Subscription { get; set; }
}
