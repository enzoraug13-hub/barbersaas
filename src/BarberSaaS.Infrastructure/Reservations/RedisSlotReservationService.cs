using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using StackExchange.Redis;
using System.Text.Json;

namespace BarberSaaS.Infrastructure.Reservations;

public class RedisSlotReservationService : ISlotReservationService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
    private readonly IDatabase _db;

    public RedisSlotReservationService(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    private static string SlotKey(Guid barberId, DateOnly date, TimeOnly start)
        => $"reserva:{barberId}:{date:yyyyMMdd}:{start:HHmm}";

    private static string ReservationKey(Guid id) => $"reservation:{id}";

    public async Task<bool> IsReservedAsync(Guid barberId, DateOnly date, TimeOnly startTime, CancellationToken ct = default)
        => await _db.KeyExistsAsync(SlotKey(barberId, date, startTime));

    public async Task<SlotReservation> ReserveAsync(
        Guid tenantId, Guid barberId, Guid serviceId,
        DateOnly date, TimeOnly startTime, TimeOnly endTime,
        CancellationToken ct = default)
    {
        var id = Guid.NewGuid();
        var reservation = new SlotReservation(id, tenantId, barberId, serviceId, date, startTime, endTime, DateTime.UtcNow.Add(Ttl));

        // SETNX (When.NotExists) garante atomicidade: se dois clientes batem no
        // mesmo slot quase ao mesmo tempo, só o primeiro consegue criar a chave.
        var slotKey = SlotKey(barberId, date, startTime);
        var acquired = await _db.StringSetAsync(slotKey, id.ToString(), Ttl, When.NotExists);
        if (!acquired)
            throw new SlotUnavailableException();

        await _db.StringSetAsync(ReservationKey(id), JsonSerializer.Serialize(reservation, JsonOpts), Ttl);
        return reservation;
    }

    public async Task<SlotReservation?> GetAsync(Guid reservationId, CancellationToken ct = default)
    {
        var value = await _db.StringGetAsync(ReservationKey(reservationId));
        return value.HasValue ? JsonSerializer.Deserialize<SlotReservation>(value!, JsonOpts) : null;
    }

    public async Task ReleaseAsync(Guid reservationId, CancellationToken ct = default)
    {
        var reservation = await GetAsync(reservationId, ct);
        if (reservation is null) return;
        await _db.KeyDeleteAsync(ReservationKey(reservationId));
        await _db.KeyDeleteAsync(SlotKey(reservation.BarberId, reservation.Date, reservation.StartTime));
    }
}
