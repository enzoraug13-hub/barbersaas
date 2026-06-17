using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.Appointments.Commands.CompleteAppointment;

public record CompleteAppointmentCommand(Guid AppointmentId, PaymentMethod PaymentMethod, Guid CompletedBy) : IRequest<bool>;

public class CompleteAppointmentHandler : IRequestHandler<CompleteAppointmentCommand, bool>
{
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly INotificationDispatcher _notifications;
    private readonly ICacheService _cache;
    private readonly IMediator _mediator;

    public CompleteAppointmentHandler(
        IAppointmentRepositoryFull appointments,
        INotificationDispatcher notifications,
        ICacheService cache,
        IMediator mediator)
    {
        _appointments = appointments;
        _notifications = notifications;
        _cache = cache;
        _mediator = mediator;
    }

    public async Task<bool> Handle(CompleteAppointmentCommand request, CancellationToken ct)
    {
        var appointment = await _appointments.GetByIdAsync(request.AppointmentId, ct)
            ?? throw new Domain.Exceptions.EntityNotFoundException("Agendamento", request.AppointmentId);

        if (appointment.Status == AppointmentStatus.Completed)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Agendamento já está concluído.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Não é possível concluir um agendamento cancelado.");

        appointment.Complete(request.PaymentMethod);
        await _appointments.UpdateAsync(appointment, ct);

        await _cache.RemoveByPatternAsync($"slots:{appointment.BarberId}:*");

        if (appointment.Client != null)
        {
            var body = $"Obrigado, {appointment.Client.Name}! Até a próxima visita. 🙏";
            await _notifications.EnqueueAsync(
                appointment.TenantId, appointment.Client.PhoneNumber, appointment.Client.Email,
                NotificationChannel.WhatsApp, NotificationEventType.AppointmentCompleted, body,
                appointment.Id, ct: ct);
        }

        foreach (var domainEvent in appointment.DomainEvents)
            await _mediator.Publish(domainEvent, ct);

        return true;
    }
}
