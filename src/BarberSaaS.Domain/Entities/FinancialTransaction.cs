using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class FinancialTransaction : BaseEntity
{
    public TransactionType Type { get; set; }
    public TransactionCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; } = 0;
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;

    public Guid? AppointmentId { get; set; }
    public Guid? BarberId { get; set; }
    public Guid CreatedByUserId { get; set; }

    public DateOnly DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateOnly TransactionDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public string? Notes { get; set; }

    public Appointment? Appointment { get; set; }
    public Barber? Barber { get; set; }
    public ICollection<FinancialPayment> Payments { get; set; } = new List<FinancialPayment>();
}

public class FinancialPayment : BaseEntity
{
    public Guid TransactionId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public Guid RegisteredByUserId { get; set; }

    public FinancialTransaction? Transaction { get; set; }
}
