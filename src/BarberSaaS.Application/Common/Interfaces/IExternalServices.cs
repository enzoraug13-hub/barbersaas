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

public interface IGoogleCalendarService
{
    Task<string?> CreateEventAsync(GoogleCalendarEventDto dto, CancellationToken ct = default);
    Task UpdateEventAsync(string calendarId, string eventId, GoogleCalendarEventDto dto, CancellationToken ct = default);
    Task CancelEventAsync(string calendarId, string eventId, string clientName, CancellationToken ct = default);
}

public record GoogleCalendarEventDto(
    Guid AppointmentId,
    Guid TenantId,
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
