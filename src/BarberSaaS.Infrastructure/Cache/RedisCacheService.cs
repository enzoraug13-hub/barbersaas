using BarberSaaS.Application.Common.Interfaces;
using StackExchange.Redis;
using System.Text.Json;

namespace BarberSaaS.Infrastructure.Cache;

public class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _db;
    private static readonly JsonSerializerOptions _opts = new() { PropertyNameCaseInsensitive = true };

    public RedisCacheService(IConnectionMultiplexer redis)
    {
        _redis = redis;
        _db    = redis.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        var value = await _db.StringGetAsync(key);
        return value.HasValue ? JsonSerializer.Deserialize<T>(value!, _opts) : null;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan expiry) where T : class
        => await _db.StringSetAsync(key, JsonSerializer.Serialize(value, _opts), expiry);

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiry) where T : class
    {
        var cached = await GetAsync<T>(key);
        if (cached is not null) return cached;
        var result = await factory();
        await SetAsync(key, result, expiry);
        return result;
    }

    public async Task RemoveAsync(string key) => await _db.KeyDeleteAsync(key);

    public async Task RemoveByPatternAsync(string pattern)
    {
        // Em cluster (Azure Managed Redis) as chaves ficam espalhadas entre shards.
        // SCAN é por-nó, então precisa varrer TODOS os masters — varrer só o primeiro
        // endpoint deixaria a invalidação parcial (chaves em outros shards sobrariam
        // até expirar por TTL). Em single node isso vira um laço de uma iteração só.
        foreach (var endpoint in _redis.GetEndPoints())
        {
            var server = _redis.GetServer(endpoint);
            if (!server.IsConnected || server.IsReplica) continue;
            await foreach (var key in server.KeysAsync(pattern: pattern))
                await _db.KeyDeleteAsync(key);
        }
    }
}
