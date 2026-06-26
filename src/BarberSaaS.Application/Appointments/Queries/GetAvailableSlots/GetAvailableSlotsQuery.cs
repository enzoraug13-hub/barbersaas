using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Interfaces.Services;
using MediatR;

namespace BarberSaaS.Application.Appointments.Queries.GetAvailableSlots;

public record GetAvailableSlotsQuery(Guid BarberId, Guid ServiceId, DateOnly Date, Guid TenantId) : IRequest<IReadOnlyList<SlotDto>>;

public record SlotDto(string Start, string End, string Label, bool Available);

public class GetAvailableSlotsHandler : IRequestHandler<GetAvailableSlotsQuery, IReadOnlyList<SlotDto>>
{
    private readonly IWorkScheduleRepository _schedules;
    private readonly IServiceRepository _services;
    private readonly IAppointmentRepositoryApp _appointments;
    private readonly ISlotGeneratorService _slotGenerator;
    private readonly ICacheService _cache;
    private readonly ISlotReservationService _reservations;

    public GetAvailableSlotsHandler(
        IWorkScheduleRepository schedules,
        IServiceRepository services,
        IAppointmentRepositoryApp appointments,
        ISlotGeneratorService slotGenerator,
        ICacheService cache,
        ISlotReservationService reservations)
    {
        _schedules = schedules; _services = services;
        _appointments = appointments; _slotGenerator = slotGenerator;
        _cache = cache; _reservations = reservations;
    }

    public async Task<IReadOnlyList<SlotDto>> Handle(GetAvailableSlotsQuery request, CancellationToken ct)
    {
        var cacheKey = $"slots:{request.BarberId}:{request.ServiceId}:{request.Date:yyyy-MM-dd}";
        var slots = await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var schedule = await _schedules.GetWithShiftsAsync(request.BarberId, ct)
                ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Barbeiro sem horários configurados.");

            var service = await _services.GetByIdAsync(request.ServiceId, ct)
                ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Serviço não encontrado.");

            var existingAppts = await _appointments.GetByBarberAndDateAsync(request.BarberId, request.Date, ct);
            var daysOff = await _appointments.GetDaysOffAsync(request.BarberId, request.Date, ct);

            var generated = _slotGenerator.GenerateDaySlots(
                schedule, existingAppts, daysOff, request.Date, service.DurationMinutes);

            return generated.Select(s => new SlotDto(
                s.Start.ToString("HH:mm"),
                s.End.ToString("HH:mm"),
                $"{s.Start:HH:mm}",
                s.IsAvailable)).ToList();
        }, TimeSpan.FromSeconds(30));

        // Reservas temporárias ficam FORA do cache de 30s: uma reserva criada agora
        // precisa marcar o horário como ocupado imediatamente pros outros clientes,
        // não só depois do cache expirar. Slot já ocupado por agendamento
        // (Available=false) não precisa de checagem de reserva.
        var result = new List<SlotDto>(slots.Count);
        foreach (var slot in slots)
        {
            if (!slot.Available) { result.Add(slot); continue; }
            var start = TimeOnly.Parse(slot.Start);
            var reserved = await _reservations.IsReservedAsync(request.BarberId, request.Date, start, ct);
            result.Add(reserved ? slot with { Available = false } : slot);
        }
        return result;
    }
}

