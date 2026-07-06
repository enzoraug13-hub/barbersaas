using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Events;

public record AppointmentCreatedEvent(
    Guid AppointmentId,
    Guid TenantId,
    Guid ClientId,
    Guid BarberId) : IDomainEvent;

public record AppointmentCancelledEvent(
    Guid AppointmentId,
    Guid TenantId,
    Guid ClientId,
    Guid BarberId,
    string? GoogleEventId) : IDomainEvent;

public record AppointmentCompletedEvent(
    Guid AppointmentId,
    Guid TenantId,
    Guid ClientId,
    decimal FinalPrice,
    Guid CompletedBy) : IDomainEvent;
