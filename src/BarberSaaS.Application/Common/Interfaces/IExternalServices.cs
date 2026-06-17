namespace BarberSaaS.Application.Common.Interfaces;

public interface IJwtService
{
    TokenPair GenerateTokens(Guid userId, string email, string name, string role, Guid? tenantId);
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
