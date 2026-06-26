using BarberSaaS.Application.Appointments.Commands.CreateAppointment;
using BarberSaaS.Application.Common.Behaviors;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Commands;

// Confirma um agendamento a partir de uma reserva de slot (Fase 1) feita no
// fluxo público — usado SÓ pelo cliente autenticado por OTP. O agendamento
// manual do painel (admin) continua por CreateAppointmentCommand, intocado.
//
// IRequireCompleteClientProfile: o pipeline já existente (ver
// RequireCompleteClientProfileBehavior) rejeita esta chamada com 403 se o
// cliente do token não tiver Name+Cpf preenchidos.
public record ConfirmAppointmentCommand(Guid ReservationId, string? Notes)
    : IRequest<AppointmentResultDto>, IRequireCompleteClientProfile;

public class ConfirmAppointmentValidator : AbstractValidator<ConfirmAppointmentCommand>
{
    public ConfirmAppointmentValidator()
    {
        RuleFor(x => x.ReservationId).NotEmpty();
    }
}

public class ConfirmAppointmentHandler : IRequestHandler<ConfirmAppointmentCommand, AppointmentResultDto>
{
    private readonly ISlotReservationService _reservations;
    private readonly IServiceRepository _services;
    private readonly IBarberRepository _barbers;
    private readonly IBarberServiceRepository _barberServices;
    private readonly IClientRepository _clients;
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly INotificationDispatcher _notifications;
    private readonly IGoogleCalendarService _googleCalendar;
    private readonly ITenantRepository _tenants;
    private readonly ICacheService _cache;
    private readonly ICurrentUser _user;
    private readonly ICurrentTenant _tenant;
    private readonly IMediator _mediator;

    public ConfirmAppointmentHandler(
        ISlotReservationService reservations, IServiceRepository services, IBarberRepository barbers,
        IBarberServiceRepository barberServices,
        IClientRepository clients, IAppointmentRepositoryFull appointments, INotificationDispatcher notifications,
        IGoogleCalendarService googleCalendar, ITenantRepository tenants, ICacheService cache,
        ICurrentUser user, ICurrentTenant tenant, IMediator mediator)
    {
        _reservations = reservations; _services = services; _barbers = barbers;
        _barberServices = barberServices;
        _clients = clients; _appointments = appointments; _notifications = notifications;
        _googleCalendar = googleCalendar; _tenants = tenants; _cache = cache;
        _user = user; _tenant = tenant; _mediator = mediator;
    }

    public async Task<AppointmentResultDto> Handle(ConfirmAppointmentCommand request, CancellationToken ct)
    {
        var reservation = await _reservations.GetAsync(request.ReservationId, ct)
            ?? throw new DomainException("Sua reserva expirou. Escolha o horário de novo.");

        // Defesa: a reserva precisa ser desta mesma barbearia (token e reserva
        // podem, em tese, vir de tenants diferentes).
        if (reservation.TenantId != _tenant.Id)
            throw new DomainException("Reserva inválida.");

        var service = await _services.GetByIdAsync(reservation.ServiceId, ct)
            ?? throw new DomainException("Serviço não encontrado.");
        var barber = await _barbers.GetByIdAsync(reservation.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");

        // Cliente já é o do token (claim sub) — sem find-or-create por telefone,
        // diferente do CreateAppointmentHandler do fluxo anônimo/admin.
        var client = await _clients.GetByIdAsync(_user.Id, ct)
            ?? throw new UnauthorizedAccessException("Cliente não encontrado.");

        // Revalida conflito: tempo passou entre a reserva e a confirmação, e o
        // dono pode ter criado um agendamento manual no mesmo horário entretanto.
        var conflicts = await _appointments.GetConflictingAsync(
            reservation.BarberId, reservation.Date, reservation.StartTime, reservation.EndTime, ct);
        if (conflicts.Any())
        {
            await _reservations.ReleaseAsync(request.ReservationId, ct);
            throw new SlotUnavailableException();
        }

        // Preço efetivo: preço do barbeiro p/ o serviço, com fallback pro preço base.
        var customPrice    = await _barberServices.GetCustomPriceAsync(
            reservation.TenantId, reservation.BarberId, reservation.ServiceId, ct);
        var effectivePrice = customPrice ?? service.Price;

        var appointment = Appointment.Create(
            reservation.TenantId, reservation.BarberId, client.Id, reservation.ServiceId,
            reservation.Date, reservation.StartTime, reservation.EndTime, effectivePrice);
        appointment.Notes = request.Notes;
        await _appointments.AddAsync(appointment, ct);

        await _reservations.ReleaseAsync(request.ReservationId, ct);
        await _cache.RemoveByPatternAsync($"slots:{reservation.BarberId}:*");

        if (!string.IsNullOrEmpty(barber.GoogleCalendarId))
        {
            try
            {
                var tenant = await _tenants.GetWithSettingsAsync(reservation.TenantId, ct);
                var startDt = new DateTimeOffset(reservation.Date.Year, reservation.Date.Month, reservation.Date.Day,
                    reservation.StartTime.Hour, reservation.StartTime.Minute, 0, TimeSpan.FromHours(-3));
                var endDt = startDt.AddMinutes(service.DurationMinutes);

                var calDto = new GoogleCalendarEventDto(
                    appointment.Id, reservation.TenantId, barber.GoogleCalendarId,
                    client.Name, client.PhoneNumber, service.Name, effectivePrice,
                    service.DurationMinutes, startDt, endDt,
                    "America/Sao_Paulo", tenant?.Settings?.BusinessName ?? "Barbearia",
                    barber.GoogleCalendarColor);

                var eventId = await _googleCalendar.CreateEventAsync(calDto, ct);
                if (eventId != null)
                {
                    appointment.GoogleEventId  = eventId;
                    appointment.GoogleSyncedAt = DateTime.UtcNow;
                    await _appointments.UpdateAsync(appointment, ct);
                }
            }
            catch (Exception ex)
            {
                appointment.GoogleSyncError = ex.Message[..Math.Min(500, ex.Message.Length)];
                await _appointments.UpdateAsync(appointment, ct);
            }
        }

        var body = $"Olá {client.Name}! Seu agendamento foi confirmado para {reservation.Date:dd/MM/yyyy} às {reservation.StartTime:HH:mm} com {barber.Name}. Serviço: {service.Name}.";
        await _notifications.EnqueueAsync(
            reservation.TenantId, client.PhoneNumber, client.Email,
            NotificationChannel.WhatsApp, NotificationEventType.AppointmentCreated, body,
            appointment.Id, ct: ct);

        foreach (var domainEvent in appointment.DomainEvents)
            await _mediator.Publish(domainEvent, ct);

        return new AppointmentResultDto(
            appointment.Id, client.Name, barber.Name, service.Name,
            reservation.Date.ToString("dd/MM/yyyy"),
            reservation.StartTime.ToString("HH:mm"), reservation.EndTime.ToString("HH:mm"),
            appointment.FinalPrice, appointment.Status.ToString());
    }
}
