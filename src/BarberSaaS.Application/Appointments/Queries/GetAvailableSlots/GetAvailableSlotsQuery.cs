using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Interfaces.Services;
using MediatR;

namespace BarberSaaS.Application.Appointments.Queries.GetAvailableSlots;

public record GetAvailableSlotsQuery(Guid BarberId, Guid ServiceId, DateOnly Date, Guid TenantId) : IRequest<IReadOnlyList<SlotDto>>;

public record SlotDto(string Start, string End, string Label);

public class GetAvailableSlotsHandler : IRequestHandler<GetAvailableSlotsQuery, IReadOnlyList<SlotDto>>
{
    private readonly IWorkScheduleRepository _schedules;
    private readonly IServiceRepository _services;
    private readonly IAppointmentRepositoryApp _appointments;
    private readonly ISlotGeneratorService _slotGenerator;
    private readonly ICacheService _cache;

    public GetAvailableSlotsHandler(
        IWorkScheduleRepository schedules,
        IServiceRepository services,
        IAppointmentRepositoryApp appointments,
        ISlotGeneratorService slotGenerator,
        ICacheService cache)
    {
        _schedules = schedules; _services = services;
        _appointments = appointments; _slotGenerator = slotGenerator;
        _cache = cache;
    }

    public async Task<IReadOnlyList<SlotDto>> Handle(GetAvailableSlotsQuery request, CancellationToken ct)
    {
        var cacheKey = $"slots:{request.BarberId}:{request.ServiceId}:{request.Date:yyyy-MM-dd}";
        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var schedule = await _schedules.GetWithShiftsAsync(request.BarberId, ct)
                ?? throw new InvalidOperationException("Barbeiro sem horários configurados.");

            var service = await _services.GetByIdAsync(request.ServiceId, ct)
                ?? throw new InvalidOperationException("Serviço não encontrado.");

            var existingAppts = await _appointments.GetByBarberAndDateAsync(request.BarberId, request.Date, ct);
            var daysOff = await _appointments.GetDaysOffAsync(request.BarberId, request.Date, ct);

            var slots = _slotGenerator.GenerateAvailableSlots(
                schedule, existingAppts, daysOff, request.Date, service.DurationMinutes);

            return slots.Select(s => new SlotDto(
                s.Start.ToString("HH:mm"),
                s.End.ToString("HH:mm"),
                $"{s.Start:HH:mm}")).ToList();
        }, TimeSpan.FromSeconds(30));
    }
}

