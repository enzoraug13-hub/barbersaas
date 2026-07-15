using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class User : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Barber;

    public bool IsActive { get; set; } = true;
    public bool EmailVerified { get; set; } = false;
    public string? EmailVerifyToken { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }

    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public int FailedLoginCount { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }

    // SEM navigation para Tenant (e sem FK no banco): o super admin não pertence
    // a barbearia nenhuma — o TenantId dele é Guid.Empty, que não existe na tabela
    // Tenants. Para todos os demais usuários o vínculo segue sendo o TenantId
    // (carimbado na criação e filtrado pelo filtro global), como nas outras entidades.
    public Barber? Barber { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
