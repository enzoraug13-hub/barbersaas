namespace BarberSaaS.Application.Common.Interfaces;

public interface ICurrentTenant
{
    Guid Id { get; }
    string? Slug { get; }
    void SetTenant(Guid tenantId, string? slug = null);
}

public interface ICurrentUser
{
    Guid Id { get; }
    string Name { get; }
    string Email { get; }
    string Role { get; }
    Guid? TenantId { get; }
    string? IpAddress { get; }
    bool IsAuthenticated { get; }
}

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateOnly TodayUtc { get; }
}
