using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Appointments.Commands.CancelAppointment;

public record CancelAppointmentCommand(Guid AppointmentId, Guid CancelledBy, string? Reason) : IRequest<bool>;

public class CancelAppointmentHandler : IRequestHandler<CancelAppointmentCommand, bool>
{
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly IGoogleCalendarService _googleCalendar;
    private readonly IBarberRepository _barbers;
    private readonly INotificationDispatcher _notifications;
    private readonly ICacheService _cache;
    private readonly IMediator _mediator;

    public CancelAppointmentHandler(
        IAppointmentRepositoryFull appointments, IGoogleCalendarService googleCalendar,
        IBarberRepository barbers, INotificationDispatcher notifications,
        ICacheService cache, IMediator mediator)
    {
        _appointments = appointments; _googleCalendar = googleCalendar;
        _barbers = barbers; _notifications = notifications;
        _cache = cache; _mediator = mediator;
    }

    public async Task<bool> Handle(CancelAppointmentCommand request, CancellationToken ct)
    {
        var appointment = await _appointments.GetByIdAsync(request.AppointmentId, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.EntityNotFoundException("Agendamento", request.AppointmentId);

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Agendamento já está cancelado.");

        var clientName = appointment.Client?.Name ?? "Cliente";
        appointment.Cancel(request.CancelledBy, request.Reason);
        await _appointments.UpdateAsync(appointment, ct);

        await _cache.RemoveByPatternAsync($"slots:{appointment.BarberId}:*");

        if (!string.IsNullOrEmpty(appointment.GoogleEventId))
        {
            var barber = await _barbers.GetByIdAsync(appointment.BarberId, ct);
            if (barber?.GoogleCalendarId != null)
            {
                try
                {
                    await _googleCalendar.CancelEventAsync(
                        barber.GoogleCalendarId, appointment.GoogleEventId, clientName, ct);
                }
                catch { /* não bloqueia cancelamento por falha no calendar */ }
            }
        }

        if (appointment.Client != null)
        {
            var body = $"Olá {appointment.Client.Name}. Seu agendamento para {appointment.Date:dd/MM/yyyy} às {appointment.StartTime:HH:mm} foi cancelado.";
            await _notifications.EnqueueAsync(
                appointment.TenantId, appointment.Client.PhoneNumber, appointment.Client.Email,
                NotificationChannel.WhatsApp, NotificationEventType.AppointmentCancelled, body,
                appointment.Id, ct: ct);
        }

        foreach (var domainEvent in appointment.DomainEvents)
            await _mediator.Publish(domainEvent, ct);

        return true;
    }
}
