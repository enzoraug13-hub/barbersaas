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

    // Só preenchido em tokens de cliente (role=client) — usado quando o
    // Client ainda não existe no banco (telefone validado por OTP, cadastro
    // ainda não completado). Ver UpdateMyProfileCommand/GetMyProfileQuery.
    string? Phone { get; }
}

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateOnly TodayUtc { get; }
}
