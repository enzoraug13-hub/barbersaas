using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Infrastructure.Persistence;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.BackgroundJobs;

public class NotificationDispatcher : INotificationDispatcher
{
    private readonly AppDbContext _db;

    public NotificationDispatcher(AppDbContext db) => _db = db;

    public async Task EnqueueAsync(
        Guid tenantId, string? phone, string? email,
        NotificationChannel channel, NotificationEventType eventType,
        string body, Guid? appointmentId = null, string? subject = null,
        DateTime? scheduledAt = null, CancellationToken ct = default)
    {
        var notification = new NotificationQueue
        {
            TenantId       = tenantId,
            RecipientPhone = phone,
            RecipientEmail = email,
            Channel        = channel,
            EventType      = eventType,
            Body           = body,
            Subject        = subject,
            AppointmentId  = appointmentId,
            ScheduledAt    = scheduledAt ?? DateTime.UtcNow
        };

        await _db.NotificationQueue.AddAsync(notification, ct);
        await _db.SaveChangesAsync(ct);

        BackgroundJob.Enqueue<NotificationProcessor>(p => p.ProcessAsync(notification.Id));
    }
}

public class NotificationProcessor
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly ILogger<NotificationProcessor> _logger;

    public NotificationProcessor(AppDbContext db, IEmailService email, ILogger<NotificationProcessor> logger)
    {
        _db = db; _email = email; _logger = logger;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 300, 1800, 7200 })]
    public async Task ProcessAsync(Guid notificationId)
    {
        var notification = await _db.NotificationQueue.FindAsync(notificationId);
        if (notification == null || notification.Status != NotificationStatus.Pending) return;

        try
        {
            switch (notification.Channel)
            {
                case NotificationChannel.Email when !string.IsNullOrEmpty(notification.RecipientEmail):
                    await _email.SendAsync(notification.RecipientEmail, notification.Subject ?? "Notificação Trimly", $"<p>{notification.Body}</p>");
                    break;
                case NotificationChannel.WhatsApp:
                    // Integração WhatsApp futura
                    _logger.LogInformation("WhatsApp para {Phone}: {Body}", notification.RecipientPhone, notification.Body);
                    break;
            }

            notification.Status = NotificationStatus.Sent;
            notification.SentAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            notification.Status        = NotificationStatus.Failed;
            notification.FailedAt      = DateTime.UtcNow;
            notification.FailureReason = ex.Message;
            notification.RetryCount++;
            _logger.LogError(ex, "Falha ao processar notificação {Id}", notificationId);
            throw;
        }
        finally
        {
            await _db.SaveChangesAsync();
        }
    }
}

public class ReminderJob
{
    private readonly AppDbContext _db;
    private readonly INotificationDispatcher _dispatcher;

    public ReminderJob(AppDbContext db, INotificationDispatcher dispatcher)
    {
        _db = db; _dispatcher = dispatcher;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task ScheduleReminders24hAsync()
    {
        var from = DateTime.UtcNow.AddHours(23.5);
        var to   = DateTime.UtcNow.AddHours(24.5);

        var appts = _db.Appointments
            .Where(a => !a.IsDeleted &&
                        a.Status == AppointmentStatus.Confirmed &&
                        a.Date == DateOnly.FromDateTime(from.AddDays(1)))
            .Select(a => new { a.Id, a.TenantId, a.Date, a.StartTime, ClientName = a.Client!.Name, ClientPhone = a.Client.PhoneNumber, ClientEmail = a.Client.Email, BarberName = a.Barber!.Name })
            .ToList();

        foreach (var appt in appts)
        {
            var body = $"Lembrete: Você tem um agendamento amanhã {appt.Date:dd/MM} às {appt.StartTime:HH:mm} com {appt.BarberName}. Até lá!";
            await _dispatcher.EnqueueAsync(appt.TenantId, appt.ClientPhone, appt.ClientEmail,
                NotificationChannel.WhatsApp, NotificationEventType.AppointmentReminder24, body, appt.Id);
        }
    }
}
