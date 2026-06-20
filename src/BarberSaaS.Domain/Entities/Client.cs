using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class Client : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Cpf { get; set; }
    public string? Email { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? PhotoUrl { get; set; }

    public string? OtpCode { get; set; }
    public DateTime? OtpExpiresAt { get; set; }
    public bool IsVerified { get; set; } = false;

    public int LoyaltyPoints { get; set; } = 0;
    public decimal WalletBalance { get; set; } = 0;

    public int TotalVisits { get; set; } = 0;
    public DateTime? LastVisitAt { get; set; }
    public bool IsBlocked { get; set; } = false;
    public string? BlockReason { get; set; }

    public Tenant? Tenant { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public LoyaltyWallet? LoyaltyWallet { get; set; }
}
