using BarberSaaS.Application.Common.Interfaces;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.ExternalServices.GoogleCalendar;

/// <summary>
/// Escreve eventos no Google Calendar do BARBEIRO, usando o access token OAuth da
/// conta que ele conectou (ver <see cref="GoogleOAuthService"/>; renovação automática
/// via refresh token). Barbeiro sem credencial válida ⇒ Create retorna null e
/// Update/Cancel viram no-op — a integração nunca derruba o fluxo de agendamento
/// (os handlers ainda embrulham em try/catch e gravam GoogleSyncError).
/// </summary>
public class GoogleCalendarService : IGoogleCalendarService
{
    private readonly IGoogleOAuthService _oauth;
    private readonly ILogger<GoogleCalendarService> _logger;

    public GoogleCalendarService(IGoogleOAuthService oauth, ILogger<GoogleCalendarService> logger)
    {
        _oauth  = oauth;
        _logger = logger;
    }

    public async Task<string?> CreateEventAsync(GoogleCalendarEventDto dto, CancellationToken ct = default)
    {
        var calendar = await CreateClientAsync(dto.BarberId, ct);
        if (calendar == null) return null;

        var barberEmail = await GetBarberEmailAsync(dto.BarberId, ct);

        return await ExecuteWithRetryAsync(async () =>
        {
            var ev  = BuildEvent(dto, barberEmail);
            var req = calendar.Events.Insert(ev, dto.GoogleCalendarId);
            req.SendUpdates = EventsResource.InsertRequest.SendUpdatesEnum.All;
            var result = await req.ExecuteAsync(ct);
            return result.Id;
        }, "CreateEvent", dto.AppointmentId);
    }

    public async Task UpdateEventAsync(Guid barberId, string calendarId, string eventId, GoogleCalendarEventDto dto, CancellationToken ct = default)
    {
        var calendar = await CreateClientAsync(barberId, ct);
        if (calendar == null) return;

        var barberEmail = await GetBarberEmailAsync(barberId, ct);

        await ExecuteWithRetryAsync(async () =>
        {
            var ev  = BuildEvent(dto, barberEmail);
            var req = calendar.Events.Update(ev, calendarId, eventId);
            req.SendUpdates = EventsResource.UpdateRequest.SendUpdatesEnum.All;
            await req.ExecuteAsync(ct);
            return true;
        }, "UpdateEvent", dto.AppointmentId);
    }

    public async Task CancelEventAsync(Guid barberId, string calendarId, string eventId, string clientName, CancellationToken ct = default)
    {
        var calendar = await CreateClientAsync(barberId, ct);
        if (calendar == null) return;

        await ExecuteWithRetryAsync(async () =>
        {
            var existing = await calendar.Events.Get(calendarId, eventId).ExecuteAsync(ct);
            existing.Summary  = $"[CANCELADO] — {clientName}";
            existing.ColorId  = "11"; // tomato
            existing.Description += "\n\n⚠️ Agendamento cancelado.";
            var req = calendar.Events.Update(existing, calendarId, eventId);
            req.SendUpdates = EventsResource.UpdateRequest.SendUpdatesEnum.All;
            await req.ExecuteAsync(ct);
            return true;
        }, "CancelEvent", Guid.Empty);
    }

    // null quando o barbeiro não tem Google conectado (ou o token não pôde ser renovado).
    private async Task<CalendarService?> CreateClientAsync(Guid barberId, CancellationToken ct)
    {
        var accessToken = await _oauth.GetValidAccessTokenAsync(barberId, ct);
        if (accessToken == null) return null;

        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = GoogleCredential.FromAccessToken(accessToken),
            ApplicationName       = "BarberSaaS"
        });
    }

    // E-mail da conta Google conectada — vira attendee para o Google disparar a
    // notificação imediata de "convite" ao barbeiro. Falha aqui não pode derrubar
    // a criação do evento: qualquer erro vira null (evento sai sem attendee).
    private async Task<string?> GetBarberEmailAsync(Guid barberId, CancellationToken ct)
    {
        try
        {
            var status = await _oauth.GetStatusAsync(barberId, ct);
            return string.IsNullOrWhiteSpace(status.Email) ? null : status.Email;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google Calendar: falha ao obter e-mail do barbeiro {BarberId} para attendee", barberId);
            return null;
        }
    }

    private static Event BuildEvent(GoogleCalendarEventDto dto, string? barberEmail) => new()
    {
        Summary     = $"✂️ {dto.ClientName} — {dto.ServiceName}",
        Description = $"👤 {dto.ClientName}\n📱 {dto.ClientPhone}\n✂️ {dto.ServiceName}\n💰 R${dto.ServicePrice:F2}\n⏱ {dto.DurationMinutes}min",
        Start       = new EventDateTime { DateTimeDateTimeOffset = dto.StartDateTime, TimeZone = dto.TimeZone },
        End         = new EventDateTime { DateTimeDateTimeOffset = dto.EndDateTime,   TimeZone = dto.TimeZone },
        ColorId     = dto.ColorId ?? "5",
        // O barbeiro entra como attendee do próprio evento: combinado com
        // SendUpdates=All, o Google trata como convite e notifica na hora
        // (push/e-mail conforme as configurações pessoais da conta dele).
        Attendees   = barberEmail is null
            ? null
            : new List<EventAttendee> { new() { Email = barberEmail, ResponseStatus = "accepted" } },
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
