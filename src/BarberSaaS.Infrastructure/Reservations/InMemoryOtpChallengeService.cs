using BarberSaaS.Application.Common.Interfaces;
using System.Collections.Concurrent;

namespace BarberSaaS.Infrastructure.Reservations;

/// <summary>Fallback de dev — mesmo racional do InMemorySlotReservationService.</summary>
public class InMemoryOtpChallengeService : IOtpChallengeService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<string, OtpChallenge> _challenges = new();

    private static string Key(Guid tenantId, string phone) => $"{tenantId}:{phone}";

    public Task SetAsync(Guid tenantId, string phone, string codeHash, Guid? existingClientId, CancellationToken ct = default)
    {
        _challenges[Key(tenantId, phone)] = new OtpChallenge(phone, tenantId, codeHash, existingClientId, DateTime.UtcNow.Add(Ttl));
        return Task.CompletedTask;
    }

    public Task<OtpChallenge?> GetAsync(Guid tenantId, string phone, CancellationToken ct = default)
    {
        var key = Key(tenantId, phone);
        if (_challenges.TryGetValue(key, out var c) && c.ExpiresAtUtc > DateTime.UtcNow)
            return Task.FromResult<OtpChallenge?>(c);
        if (c is not null) _challenges.TryRemove(key, out _);
        return Task.FromResult<OtpChallenge?>(null);
    }

    public Task RemoveAsync(Guid tenantId, string phone, CancellationToken ct = default)
    {
        _challenges.TryRemove(Key(tenantId, phone), out _);
        return Task.CompletedTask;
    }
}
