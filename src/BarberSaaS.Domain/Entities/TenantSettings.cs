using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class TenantSettings : BaseEntity
{
    public string? LogoUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string PrimaryColor { get; set; } = "#1a1a1a";
    public string SecondaryColor { get; set; } = "#c9a84c";
    public string AccentColor { get; set; } = "#ffffff";

    public string BusinessName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }
    public string? Phone { get; set; }
    public string? InstagramUrl { get; set; }
    public string? WhatsAppNumber { get; set; }

    public int SlotIntervalMinutes { get; set; } = 15;
    public int MaxAdvanceDays { get; set; } = 30;
    public int MinNoticeMinutes { get; set; } = 30;
    public bool AllowOnlineBooking { get; set; } = true;
    public bool RequireConfirmation { get; set; } = false;
    public string PublicSlug { get; set; } = string.Empty;

    public bool SendConfirmationSms { get; set; } = true;
    public bool SendReminderSms { get; set; } = true;
    public int ReminderHoursBefore { get; set; } = 24;

    // Horário de funcionamento da barbearia (diferente do WorkSchedule por
    // barbeiro) — JSON com até 7 entradas, uma por dia da semana.
    public string? BusinessHoursJson { get; set; }

    public Tenant? Tenant { get; set; }
}
