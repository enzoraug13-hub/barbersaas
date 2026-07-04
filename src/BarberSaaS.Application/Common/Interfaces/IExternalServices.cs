namespace BarberSaaS.Application.Common.Interfaces;

public interface IJwtService
{
    TokenPair GenerateTokens(Guid userId, string email, string name, string role, Guid? tenantId, string? phone = null);
    Guid? ValidateToken(string token);
}

public record TokenPair(string AccessToken, string RefreshToken, DateTime ExpiresAt);

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan expiry) where T : class;
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiry) where T : class;
    Task RemoveAsync(string key);
    Task RemoveByPatternAsync(string pattern);
}

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}

/// <summary>
/// Opções de autenticação vindas da configuração.
/// <c>RequireEmailConfirmation</c> (Auth:RequireEmailConfirmation, default false): enquanto o
/// provedor de e-mail não estiver configurado em produção, deixe false — com true o cadastro
/// fica pendente até o link de confirmação chegar por e-mail, e o login é bloqueado.
/// <c>FrontendUrl</c> (App:FrontendUrl): base para montar os links de e-mail (ex.: https://app.vercel.app).
/// </summary>
public interface IAuthOptions
{
    bool RequireEmailConfirmation { get; }
    string FrontendUrl { get; }
}

/// <summary>Resultado da consulta de CNPJ na Receita (via BrasilAPI).</summary>
/// <param name="Found">False quando a Receita não conhece o CNPJ (404).</param>
/// <param name="RazaoSocial">Razão social registrada, quando encontrada.</param>
/// <param name="Situacao">Descrição da situação cadastral (ex.: "ATIVA", "BAIXADA").</param>
public record CnpjLookupResult(bool Found, string? RazaoSocial, string? Situacao);

public interface ICnpjLookupService
{
    /// <summary>
    /// Consulta o CNPJ na Receita. Retorna <c>null</c> quando a consulta falhou
    /// (API fora do ar, timeout, erro 5xx) — o chamador decide fail-open.
    /// </summary>
    Task<CnpjLookupResult?> LookupAsync(string cnpjDigits, CancellationToken ct = default);
}

public interface ISmsService
{
    /// <summary>True quando há um provedor real (ex.: Twilio) configurado.</summary>
    bool IsConfigured { get; }
    Task SendAsync(string toPhone, string message, CancellationToken ct = default);
}

/// <summary>
/// Escrita de eventos no Google Calendar do BARBEIRO (conta conectada via OAuth —
/// ver <see cref="IGoogleOAuthService"/>). Nunca lança por barbeiro desconectado:
/// sem credencial válida, Create retorna <c>null</c> e Update/Cancel viram no-op.
/// </summary>
public interface IGoogleCalendarService
{
    Task<string?> CreateEventAsync(GoogleCalendarEventDto dto, CancellationToken ct = default);
    Task UpdateEventAsync(Guid barberId, string calendarId, string eventId, GoogleCalendarEventDto dto, CancellationToken ct = default);
    Task CancelEventAsync(Guid barberId, string calendarId, string eventId, string clientName, CancellationToken ct = default);
}

/// <summary>
/// Conexão OAuth do Google Calendar por barbeiro. Implementada na Infrastructure —
/// os tokens (cifrados) nunca saem de lá; a Application só vê URLs, status e o
/// access token efêmero já renovado.
/// </summary>
public interface IGoogleOAuthService
{
    /// <summary>True quando Google:ClientId/ClientSecret/RedirectUri estão configurados.</summary>
    bool IsConfigured { get; }

    /// <summary>URL de consentimento do Google com state assinado (tenant+barbeiro, validade curta).</summary>
    string BuildConnectUrl(Guid tenantId, Guid barberId);

    /// <summary>
    /// Valida o state, troca o code por tokens e persiste a credencial do barbeiro.
    /// Nunca lança: falha vira <c>Success=false</c> (BarberId presente quando o state era válido).
    /// </summary>
    Task<GoogleCallbackResult> CompleteCallbackAsync(string code, string state, CancellationToken ct = default);

    /// <summary>Revoga o token no Google (best-effort) e apaga a credencial (hard delete).</summary>
    Task DisconnectAsync(Guid barberId, CancellationToken ct = default);

    Task<GoogleConnectionStatus> GetStatusAsync(Guid barberId, CancellationToken ct = default);

    /// <summary>
    /// Access token válido do barbeiro, renovando via refresh_token quando perto de
    /// expirar. <c>null</c> = sem credencial/decifração falhou/refresh revogado
    /// (neste último caso a credencial é auto-removida).
    /// </summary>
    Task<string?> GetValidAccessTokenAsync(Guid barberId, CancellationToken ct = default);
}

public record GoogleCallbackResult(bool Success, Guid? TenantId, Guid? BarberId, string? Email);
public record GoogleConnectionStatus(bool Connected, string? Email, DateTime? ConnectedAt);

public record GoogleCalendarEventDto(
    Guid AppointmentId,
    Guid TenantId,
    Guid BarberId,
    string GoogleCalendarId,
    string ClientName,
    string ClientPhone,
    string ServiceName,
    decimal ServicePrice,
    int DurationMinutes,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    string TimeZone,
    string TenantName,
    string? ColorId = null);

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public interface INotificationDispatcher
{
    Task EnqueueAsync(
        Guid tenantId,
        string? phone,
        string? email,
        BarberSaaS.Domain.Enums.NotificationChannel channel,
        BarberSaaS.Domain.Enums.NotificationEventType eventType,
        string body,
        Guid? appointmentId = null,
        string? subject = null,
        DateTime? scheduledAt = null,
        CancellationToken ct = default);
}
