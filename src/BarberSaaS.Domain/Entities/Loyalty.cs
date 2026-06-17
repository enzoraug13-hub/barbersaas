using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class LoyaltyProgram : BaseEntity
{
    public bool IsEnabled { get; set; } = false;
    public decimal PointsPerReal { get; set; } = 1.0m;
    public decimal RedemptionRate { get; set; } = 0.01m;
    public int MinRedemptionPoints { get; set; } = 100;
    public int? ExpirationDays { get; set; }
}

public class LoyaltyWallet : BaseEntity
{
    public Guid ClientId { get; set; }
    public int TotalPoints { get; set; } = 0;
    public int LifetimePoints { get; set; } = 0;
    public decimal CashbackBalance { get; set; } = 0;
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    public Client? Client { get; set; }
    public ICollection<LoyaltyTransaction> Transactions { get; set; } = new List<LoyaltyTransaction>();
}

public class LoyaltyTransaction : BaseEntity
{
    public Guid WalletId { get; set; }
    public LoyaltyTransactionType Type { get; set; }
    public int Points { get; set; }
    public decimal CashbackAmount { get; set; } = 0;
    public string Description { get; set; } = string.Empty;
    public Guid? AppointmentId { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public LoyaltyWallet? Wallet { get; set; }
}

public class Coupon : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal MinOrderValue { get; set; } = 0;
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; } = 0;
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public bool IsActive { get; set; } = true;
}
