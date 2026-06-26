namespace BarberSaaS.Application.Common.Interfaces;

// Reserva temporária de um slot enquanto o cliente está no fluxo de
// telefone/OTP (passos 6-7 do agendamento) — impede que dois clientes
// terminem de confirmar o mesmo horário simultaneamente. TTL fixo de
// 10 minutos, contado a partir da chamada a ReserveAsync.
public record SlotReservation(
    Guid Id,
    Guid TenantId,
    Guid BarberId,
    Guid ServiceId,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    DateTime ExpiresAtUtc);

public interface ISlotReservationService
{
    /// <summary>True se já existe uma reserva ativa (não expirada) pra esse barbeiro/horário.</summary>
    Task<bool> IsReservedAsync(Guid barberId, DateOnly date, TimeOnly startTime, CancellationToken ct = default);

    /// <summary>
    /// Cria a reserva de forma atômica — lança SlotUnavailableException se alguém
    /// reservou esse mesmo barbeiro/horário entre a checagem do chamador e esta chamada.
    /// </summary>
    Task<SlotReservation> ReserveAsync(
        Guid tenantId, Guid barberId, Guid serviceId,
        DateOnly date, TimeOnly startTime, TimeOnly endTime,
        CancellationToken ct = default);

    Task<SlotReservation?> GetAsync(Guid reservationId, CancellationToken ct = default);

    Task ReleaseAsync(Guid reservationId, CancellationToken ct = default);
}
