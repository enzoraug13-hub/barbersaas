using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using System.Collections.Concurrent;

namespace BarberSaaS.Infrastructure.Reservations;

/// <summary>
/// Fallback de dev quando ConnectionStrings:Redis não está configurado (hoje é o
/// caso de appsettings.Development.json). Registrado como Singleton — vive na
/// memória do processo, então reservas se perdem ao reiniciar a API e não são
/// compartilhadas entre instâncias, mas isso é aceitável só pra testar o fluxo
/// localmente. Em produção, configure ConnectionStrings__Redis pra usar
/// RedisSlotReservationService de verdade (necessário com mais de uma instância
/// da API rodando).
/// </summary>
public class InMemorySlotReservationService : ISlotReservationService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);
    private readonly ConcurrentDictionary<string, SlotReservation> _bySlot = new();
    private readonly ConcurrentDictionary<Guid, string> _slotKeyById = new();
    private readonly object _gate = new();

    private static string SlotKey(Guid barberId, DateOnly date, TimeOnly start) => $"{barberId}:{date:yyyyMMdd}:{start:HHmm}";

    private bool TryGetActive(string slotKey, out SlotReservation reservation)
    {
        if (_bySlot.TryGetValue(slotKey, out var r) && r.ExpiresAtUtc > DateTime.UtcNow)
        {
            reservation = r;
            return true;
        }
        if (r is not null) _bySlot.TryRemove(slotKey, out _);
        reservation = null!;
        return false;
    }

    public Task<bool> IsReservedAsync(Guid barberId, DateOnly date, TimeOnly startTime, CancellationToken ct = default)
        => Task.FromResult(TryGetActive(SlotKey(barberId, date, startTime), out _));

    public Task<SlotReservation> ReserveAsync(
        Guid tenantId, Guid barberId, Guid serviceId,
        DateOnly date, TimeOnly startTime, TimeOnly endTime,
        CancellationToken ct = default)
    {
        var slotKey = SlotKey(barberId, date, startTime);
        lock (_gate)
        {
            if (TryGetActive(slotKey, out _))
                throw new SlotUnavailableException();

            var id = Guid.NewGuid();
            var reservation = new SlotReservation(id, tenantId, barberId, serviceId, date, startTime, endTime, DateTime.UtcNow.Add(Ttl));
            _bySlot[slotKey] = reservation;
            _slotKeyById[id] = slotKey;
            return Task.FromResult(reservation);
        }
    }

    public Task<SlotReservation?> GetAsync(Guid reservationId, CancellationToken ct = default)
    {
        if (!_slotKeyById.TryGetValue(reservationId, out var slotKey)) return Task.FromResult<SlotReservation?>(null);
        return Task.FromResult(TryGetActive(slotKey, out var r) ? r : null);
    }

    public Task ReleaseAsync(Guid reservationId, CancellationToken ct = default)
    {
        if (_slotKeyById.TryRemove(reservationId, out var slotKey))
            _bySlot.TryRemove(slotKey, out _);
        return Task.CompletedTask;
    }
}
