using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Events;

namespace BarberSaaS.Domain.Entities;

public class Appointment : BaseEntity
{
    public Guid BarberId { get; set; }
    public Guid ClientId { get; set; }
    public Guid ServiceId { get; set; }

    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public DateTime? CancelledAt { get; set; }
    public Guid? CancelledBy { get; set; }
    public string? CancelReason { get; set; }
    public DateTime? CompletedAt { get; set; }

    public string? Notes { get; set; }
    public string? InternalNotes { get; set; }

    public decimal ServicePrice { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public decimal FinalPrice { get; set; }
    public bool IsPaid { get; set; } = false;
    public DateTime? PaidAt { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }

    public string? GoogleEventId { get; set; }
    public DateTime? GoogleSyncedAt { get; set; }
    public string? GoogleSyncError { get; set; }

    public int PointsEarned { get; set; } = 0;

    public Tenant? Tenant { get; set; }
    public Barber? Barber { get; set; }
    public Client? Client { get; set; }
    public Service? Service { get; set; }

    public static Appointment Create(Guid tenantId, Guid barberId, Guid clientId,
        Guid serviceId, DateOnly date, TimeOnly start, TimeOnly end,
        decimal price, decimal discount = 0)
    {
        var appt = new Appointment
        {
            TenantId     = tenantId,
            BarberId     = barberId,
            ClientId     = clientId,
            ServiceId    = serviceId,
            Date         = date,
            StartTime    = start,
            EndTime      = end,
            ServicePrice = price,
            DiscountAmount = discount,
            FinalPrice   = price - discount,
            Status       = AppointmentStatus.Pending
        };
        appt.AddDomainEvent(new AppointmentCreatedEvent(appt.Id, tenantId, clientId, barberId));
        return appt;
    }

    public void Cancel(Guid cancelledBy, string? reason = null)
    {
        Status      = AppointmentStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancelledBy = cancelledBy;
        CancelReason = reason;
        AddDomainEvent(new AppointmentCancelledEvent(Id, TenantId, ClientId, BarberId, GoogleEventId));
    }

    public void Complete(PaymentMethod paymentMethod)
    {
        Status      = AppointmentStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        IsPaid      = true;
        PaidAt      = DateTime.UtcNow;
        PaymentMethod = paymentMethod;
        AddDomainEvent(new AppointmentCompletedEvent(Id, TenantId, ClientId, FinalPrice));
    }
}
