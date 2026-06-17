namespace BarberSaaS.Domain.Enums;

public enum AppointmentStatus : byte
{
    Pending   = 0,
    Confirmed = 1,
    Completed = 2,
    Cancelled = 3,
    NoShow    = 4
}
