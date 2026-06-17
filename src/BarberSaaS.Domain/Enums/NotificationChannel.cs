namespace BarberSaaS.Domain.Enums;

public enum NotificationChannel : byte
{
    WhatsApp = 0,
    Email    = 1,
    Push     = 2
}

public enum NotificationEventType : byte
{
    AppointmentCreated    = 0,
    AppointmentConfirmed  = 1,
    AppointmentCancelled  = 2,
    AppointmentReminder24 = 3,
    AppointmentReminder2  = 4,
    AppointmentCompleted  = 5,
    WelcomeClient         = 6,
    LoyaltyPointsEarned   = 7,
    SubscriptionRenewal   = 8,
    PaymentOverdue        = 9
}

public enum NotificationStatus : byte
{
    Pending   = 0,
    Sent      = 1,
    Failed    = 2,
    Cancelled = 3
}
