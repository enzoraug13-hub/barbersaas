using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Appointments.Commands.CreateAppointment;

public record CreateAppointmentCommand(
    Guid TenantId,
    Guid BarberId,
    Guid ServiceId,
    string ClientName,
    string ClientPhone,
    string? ClientEmail,
    DateOnly Date,
    TimeOnly StartTime,
    string? Notes) : IRequest<AppointmentResultDto>;

public record AppointmentResultDto(
    Guid Id,
    string ClientName,
    string BarberName,
    string ServiceName,
    string Date,
    string StartTime,
    string EndTime,
    decimal FinalPrice,
    string Status);

public class CreateAppointmentValidator : AbstractValidator<CreateAppointmentCommand>
{
    public CreateAppointmentValidator()
    {
        RuleFor(x => x.BarberId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.ClientName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.ClientPhone).NotEmpty().Matches(@"^\+[1-9]\d{1,14}$")
            .WithMessage("Telefone inválido. Use formato internacional: +5511999999999");
        RuleFor(x => x.Date).GreaterThanOrEqualTo(DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("A data não pode ser no passado.");
    }
}

public class CreateAppointmentHandler : IRequestHandler<CreateAppointmentCommand, AppointmentResultDto>
{
    private readonly IClientRepository _clients;
    private readonly IServiceRepository _services;
    private readonly IBarberRepository _barbers;
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly INotificationDispatcher _notifications;
    private readonly IGoogleCalendarService _googleCalendar;
    private readonly ITenantRepository _tenants;
    private readonly ICacheService _cache;
    private readonly IMediator _mediator;

    public CreateAppointmentHandler(
        IClientRepository clients, IServiceRepository services, IBarberRepository barbers,
        IAppointmentRepositoryFull appointments, INotificationDispatcher notifications,
        IGoogleCalendarService googleCalendar, ITenantRepository tenants,
        ICacheService cache, IMediator mediator)
    {
        _clients = clients; _services = services; _barbers = barbers;
        _appointments = appointments; _notifications = notifications;
        _googleCalendar = googleCalendar; _tenants = tenants;
        _cache = cache; _mediator = mediator;
    }

    public async Task<AppointmentResultDto> Handle(CreateAppointmentCommand request, CancellationToken ct)
    {
        var service = await _services.GetByIdAsync(request.ServiceId, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Serviço não encontrado.");
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Barbeiro não encontrado.");

        // Defesa explícita de tenant: no fluxo público o filtro global fica desativado
        // (sem tenant no contexto), então garantimos que serviço e barbeiro pertencem
        // mesmo ao tenant do agendamento — impede reservar usando IDs de outra barbearia.
        if (service.TenantId != request.TenantId)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Serviço não encontrado.");
        if (barber.TenantId != request.TenantId)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Barbeiro não encontrado.");

        var endTime = request.StartTime.AddMinutes(service.DurationMinutes);

        var conflicts = await _appointments.GetConflictingAsync(
            request.BarberId, request.Date, request.StartTime, endTime, ct);
        if (conflicts.Any())
            throw new BarberSaaS.Domain.Exceptions.SlotUnavailableException();

        var client = await _clients.GetByPhoneAsync(request.ClientPhone, request.TenantId, ct);
        if (client == null)
        {
            client = new Client
            {
                TenantId    = request.TenantId,
                Name        = request.ClientName,
                PhoneNumber = request.ClientPhone,
                Email       = request.ClientEmail
            };
            await _clients.AddAsync(client, ct);
        }
        else
        {
            client.Name = request.ClientName;
            if (!string.IsNullOrEmpty(request.ClientEmail)) client.Email = request.ClientEmail;
            await _clients.UpdateAsync(client, ct);
        }

        var appointment = Appointment.Create(
            request.TenantId, request.BarberId, client.Id, request.ServiceId,
            request.Date, request.StartTime, endTime, service.Price);

        appointment.Notes = request.Notes;
        await _appointments.AddAsync(appointment, ct);

        await _cache.RemoveByPatternAsync($"slots:{request.BarberId}:*");

        // Google Calendar (fire-and-forget, não bloqueia o agendamento por falha)
        if (!string.IsNullOrEmpty(barber.GoogleCalendarId))
        {
            try
            {
                var tenant = await _tenants.GetWithSettingsAsync(request.TenantId, ct);
                var startDt = new DateTimeOffset(request.Date.Year, request.Date.Month, request.Date.Day,
                    request.StartTime.Hour, request.StartTime.Minute, 0, TimeSpan.FromHours(-3));
                var endDt = startDt.AddMinutes(service.DurationMinutes);

                var calDto = new GoogleCalendarEventDto(
                    appointment.Id, request.TenantId, barber.GoogleCalendarId,
                    client.Name, client.PhoneNumber, service.Name, service.Price,
                    service.DurationMinutes, startDt, endDt,
                    "America/Sao_Paulo", tenant?.Settings?.BusinessName ?? "Barbearia",
                    barber.GoogleCalendarColor);

                var eventId = await _googleCalendar.CreateEventAsync(calDto, ct);
                if (eventId != null)
                {
                    appointment.GoogleEventId   = eventId;
                    appointment.GoogleSyncedAt  = DateTime.UtcNow;
                    await _appointments.UpdateAsync(appointment, ct);
                }
            }
            catch (Exception ex)
            {
                appointment.GoogleSyncError = ex.Message[..Math.Min(500, ex.Message.Length)];
                await _appointments.UpdateAsync(appointment, ct);
            }
        }

        var body = $"Olá {client.Name}! Seu agendamento foi confirmado para {request.Date:dd/MM/yyyy} às {request.StartTime:HH:mm} com {barber.Name}. Serviço: {service.Name}.";
        await _notifications.EnqueueAsync(
            request.TenantId, client.PhoneNumber, client.Email,
            NotificationChannel.WhatsApp, NotificationEventType.AppointmentCreated, body,
            appointment.Id, ct: ct);

        foreach (var domainEvent in appointment.DomainEvents)
            await _mediator.Publish(domainEvent, ct);

        return new AppointmentResultDto(
            appointment.Id, client.Name, barber.Name, service.Name,
            request.Date.ToString("dd/MM/yyyy"),
            request.StartTime.ToString("HH:mm"), endTime.ToString("HH:mm"),
            appointment.FinalPrice, appointment.Status.ToString());
    }
}

