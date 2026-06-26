using BarberSaaS.Application.Common.Interfaces;
using StackExchange.Redis;
using System.Text.Json;

namespace BarberSaaS.Infrastructure.Reservations;

public class RedisOtpChallengeService : IOtpChallengeService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
    private readonly IDatabase _db;

    public RedisOtpChallengeService(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    private static string Key(Guid tenantId, string phone) => $"otp-challenge:{tenantId}:{phone}";

    public async Task SetAsync(Guid tenantId, string phone, string codeHash, Guid? existingClientId, CancellationToken ct = default)
    {
        var challenge = new OtpChallenge(phone, tenantId, codeHash, existingClientId, DateTime.UtcNow.Add(Ttl));
        await _db.StringSetAsync(Key(tenantId, phone), JsonSerializer.Serialize(challenge, JsonOpts), Ttl);
    }

    public async Task<OtpChallenge?> GetAsync(Guid tenantId, string phone, CancellationToken ct = default)
    {
        var value = await _db.StringGetAsync(Key(tenantId, phone));
        return value.HasValue ? JsonSerializer.Deserialize<OtpChallenge>(value!, JsonOpts) : null;
    }

    public async Task RemoveAsync(Guid tenantId, string phone, CancellationToken ct = default)
        => await _db.KeyDeleteAsync(Key(tenantId, phone));
}
