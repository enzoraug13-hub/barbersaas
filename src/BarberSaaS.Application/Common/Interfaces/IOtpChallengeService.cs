namespace BarberSaaS.Application.Common.Interfaces;

// Guarda telefone+código OTP durante a validação SEM criar Client no banco —
// mesmo padrão do ISlotReservationService (Redis em prod, fallback em
// memória em dev). ExistingClientId vem preenchido só se o telefone já
// pertence a um Client existente (find, nunca create, em RequestOtpCommand).
public record OtpChallenge(
    string Phone,
    Guid TenantId,
    string CodeHash,
    Guid? ExistingClientId,
    DateTime ExpiresAtUtc);

public interface IOtpChallengeService
{
    Task SetAsync(Guid tenantId, string phone, string codeHash, Guid? existingClientId, CancellationToken ct = default);

    Task<OtpChallenge?> GetAsync(Guid tenantId, string phone, CancellationToken ct = default);

    Task RemoveAsync(Guid tenantId, string phone, CancellationToken ct = default);
}
