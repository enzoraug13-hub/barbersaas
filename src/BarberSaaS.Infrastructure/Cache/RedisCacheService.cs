using BarberSaaS.Application.Common.Interfaces;
using StackExchange.Redis;
using System.Text.Json;

namespace BarberSaaS.Infrastructure.Cache;

public class RedisCacheService : ICacheService
{
    private readonly IDatabase _db;
    private readonly IServer   _server;
    private static readonly JsonSerializerOptions _opts = new() { PropertyNameCaseInsensitive = true };

    public RedisCacheService(IConnectionMultiplexer redis)
    {
        _db     = redis.GetDatabase();
        _server = redis.GetServer(redis.GetEndPoints().First());
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
        await foreach (var key in _server.KeysAsync(pattern: pattern))
            await _db.KeyDeleteAsync(key);
    }
}
