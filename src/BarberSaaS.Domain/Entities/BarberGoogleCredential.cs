using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

/// <summary>
/// Tokens OAuth do Google Calendar de um barbeiro (fluxo "Conectar Google Calendar").
/// <c>AccessToken</c>/<c>RefreshToken</c> são armazenados CIFRADOS (AES-GCM, chave
/// derivada de Jwt:SecretKey — ver GoogleTokenCipher) e nunca podem aparecer em
/// DTO/endpoint. A remoção é sempre FÍSICA (hard delete): token revogado não deve
/// sobreviver como linha soft-deleted no banco.
/// </summary>
public class BarberGoogleCredential : BaseEntity
{
    public Guid BarberId { get; set; }

    /// <summary>Conta Google conectada — só para exibição no painel ("conectado como ...").</summary>
    public string? GoogleEmail { get; set; }

    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>Expiração do access token (UTC). Renovado via refresh_token quando próximo de vencer.</summary>
    public DateTime AccessTokenExpiresAt { get; set; }

    public DateTime ConnectedAt { get; set; }

    public Barber? Barber { get; set; }
}
