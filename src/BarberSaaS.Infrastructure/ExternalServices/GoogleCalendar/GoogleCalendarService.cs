using BarberSaaS.Application.Common.Interfaces;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.ExternalServices.GoogleCalendar;

public class GoogleCalendarService : IGoogleCalendarService
{
    private readonly CalendarService? _calendar;
    private readonly ILogger<GoogleCalendarService> _logger;
    private readonly bool _enabled;

    public GoogleCalendarService(IConfiguration config, ILogger<GoogleCalendarService> logger)
    {
        _logger = logger;
        var keyPath = config["GoogleCalendar:ServiceAccountKeyPath"];
        _enabled = !string.IsNullOrEmpty(keyPath) && File.Exists(keyPath);

        if (_enabled)
        {
            var credential = GoogleCredential.FromFile(keyPath)
                .CreateScoped(CalendarService.Scope.Calendar);
            _calendar = new CalendarService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName       = "BarberSaaS"
            });
        }
    }

    public async Task<string?> CreateEventAsync(GoogleCalendarEventDto dto, CancellationToken ct = default)
    {
        if (!_enabled || _calendar == null) return null;

        return await ExecuteWithRetryAsync(async () =>
        {
            var ev = BuildEvent(dto);
            var req = _calendar.Events.Insert(ev, dto.GoogleCalendarId);
            var result = await req.ExecuteAsync(ct);
            return result.Id;
        }, "CreateEvent", dto.AppointmentId);
    }

    public async Task UpdateEventAsync(string calendarId, string eventId, GoogleCalendarEventDto dto, CancellationToken ct = default)
    {
        if (!_enabled || _calendar == null) return;

        await ExecuteWithRetryAsync(async () =>
        {
            var ev  = BuildEvent(dto);
            await _calendar.Events.Update(ev, calendarId, eventId).ExecuteAsync(ct);
            return true;
        }, "UpdateEvent", dto.AppointmentId);
    }

    public async Task CancelEventAsync(string calendarId, string eventId, string clientName, CancellationToken ct = default)
    {
        if (!_enabled || _calendar == null) return;

        await ExecuteWithRetryAsync(async () =>
        {
            var existing = await _calendar.Events.Get(calendarId, eventId).ExecuteAsync(ct);
            existing.Summary  = $"[CANCELADO] — {clientName}";
            existing.ColorId  = "11"; // tomato
            existing.Description += "\n\n⚠️ Agendamento cancelado.";
            await _calendar.Events.Update(existing, calendarId, eventId).ExecuteAsync(ct);
            return true;
        }, "CancelEvent", Guid.Empty);
    }

    private static Event BuildEvent(GoogleCalendarEventDto dto) => new()
    {
        Summary     = $"✂️ {dto.ClientName} — {dto.ServiceName}",
        Description = $"👤 {dto.ClientName}\n📱 {dto.ClientPhone}\n✂️ {dto.ServiceName}\n💰 R${dto.ServicePrice:F2}\n⏱ {dto.DurationMinutes}min",
        Start       = new EventDateTime { DateTimeDateTimeOffset = dto.StartDateTime, TimeZone = dto.TimeZone },
        End         = new EventDateTime { DateTimeDateTimeOffset = dto.EndDateTime,   TimeZone = dto.TimeZone },
        ColorId     = dto.ColorId ?? "5",
        ExtendedProperties = new Event.ExtendedPropertiesData
        {
            Private__ = new Dictionary<string, string>
            {
                { "appointmentId", dto.AppointmentId.ToString() },
                { "tenantId",      dto.TenantId.ToString() }
            }
        }
    };

    private async Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> action, string op, Guid id, int maxRetries = 3)
    {
        var delay = TimeSpan.FromSeconds(2);
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try { return await action(); }
            catch (Google.GoogleApiException ex) when ((int)ex.HttpStatusCode is 429 or 503)
            {
                if (attempt == maxRetries) throw;
                _logger.LogWarning("Google Calendar {Op} retry {Attempt}/{Max} for {Id}", op, attempt, maxRetries, id);
                await Task.Delay(delay);
                delay *= 2;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google Calendar {Op} failed for {Id}", op, id);
                throw;
            }
        }
        throw new InvalidOperationException("Unreachable");
    }
}
