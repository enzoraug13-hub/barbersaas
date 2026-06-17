using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class NotificationTemplate : BaseEntity
{
    public NotificationEventType EventType { get; set; }
    public NotificationChannel Channel { get; set; }
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class NotificationQueue : BaseEntity
{
    public string? RecipientPhone { get; set; }
    public string? RecipientEmail { get; set; }
    public NotificationChannel Channel { get; set; }
    public NotificationEventType EventType { get; set; }
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public Guid? AppointmentId { get; set; }
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
    public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
    public DateTime? FailedAt { get; set; }
    public string? FailureReason { get; set; }
    public int RetryCount { get; set; } = 0;
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserRole { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? CorrelationId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
