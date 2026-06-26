using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Appointments.Commands.ReserveSlot;

public record ReserveSlotCommand(
    Guid TenantId,
    Guid BarberId,
    Guid ServiceId,
    DateOnly Date,
    TimeOnly StartTime) : IRequest<ReserveSlotResultDto>;

public record ReserveSlotResultDto(Guid ReservationId, DateTime ExpiresAtUtc);

public class ReserveSlotValidator : AbstractValidator<ReserveSlotCommand>
{
    public ReserveSlotValidator()
    {
        RuleFor(x => x.BarberId).NotEmpty();
        RuleFor(x => x.ServiceId).NotEmpty();
        RuleFor(x => x.Date).GreaterThanOrEqualTo(DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("A data não pode ser no passado.");
    }
}

public class ReserveSlotHandler : IRequestHandler<ReserveSlotCommand, ReserveSlotResultDto>
{
    private readonly IServiceRepository _services;
    private readonly IBarberRepository _barbers;
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly ISlotReservationService _reservations;

    public ReserveSlotHandler(
        IServiceRepository services, IBarberRepository barbers,
        IAppointmentRepositoryFull appointments, ISlotReservationService reservations)
    {
        _services = services; _barbers = barbers;
        _appointments = appointments; _reservations = reservations;
    }

    public async Task<ReserveSlotResultDto> Handle(ReserveSlotCommand request, CancellationToken ct)
    {
        var service = await _services.GetByIdAsync(request.ServiceId, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Serviço não encontrado.");
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Barbeiro não encontrado.");

        // Mesma defesa do CreateAppointmentHandler: fluxo público roda sem tenant
        // no contexto (filtro global desativado), então confirmamos aqui.
        if (service.TenantId != request.TenantId)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Serviço não encontrado.");
        if (barber.TenantId != request.TenantId)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Barbeiro não encontrado.");

        var endTime = request.StartTime.AddMinutes(service.DurationMinutes);

        var conflicts = await _appointments.GetConflictingAsync(request.BarberId, request.Date, request.StartTime, endTime, ct);
        if (conflicts.Any())
            throw new BarberSaaS.Domain.Exceptions.SlotUnavailableException();

        if (await _reservations.IsReservedAsync(request.BarberId, request.Date, request.StartTime, ct))
            throw new BarberSaaS.Domain.Exceptions.SlotUnavailableException();

        // ReserveAsync faz a checagem final de forma atômica (SETNX) — cobre a
        // janela de corrida entre o IsReservedAsync acima e este ponto.
        var reservation = await _reservations.ReserveAsync(
            request.TenantId, request.BarberId, request.ServiceId,
            request.Date, request.StartTime, endTime, ct);

        return new ReserveSlotResultDto(reservation.Id, reservation.ExpiresAtUtc);
    }
}
