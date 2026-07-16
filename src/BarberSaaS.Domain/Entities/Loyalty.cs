using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class LoyaltyProgram : BaseEntity
{
    public bool IsEnabled { get; set; } = false;
    // Modo Points: crédito = FinalPrice × PointsPerReal. Modo Visits: crédito = 1
    // por atendimento concluído (PointsPerReal é ignorado). Mesma unidade no banco.
    public LoyaltyMode Mode { get; set; } = LoyaltyMode.Points;
    public decimal PointsPerReal { get; set; } = 1.0m;
    public decimal RedemptionRate { get; set; } = 0.01m;
    public int MinRedemptionPoints { get; set; } = 100;
    // Expiração de pontos ainda não implementada — campo reservado.
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

/// <summary>
/// Item do catálogo de recompensas: um serviço ou produto já existente no tenant,
/// com custo em pontos/cortes definido pelo dono.
/// </summary>
public class LoyaltyReward : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public LoyaltyRewardType Type { get; set; }
    public Guid? ServiceId { get; set; }
    public Guid? ProductId { get; set; }
    public int Cost { get; set; }
    public bool IsActive { get; set; } = true;

    public Service? Service { get; set; }
    public Product? Product { get; set; }
}

/// <summary>
/// Resgate feito pelo cliente. RewardName/CostPaid são snapshots: se o dono renomear
/// ou reprecificar a recompensa depois, o histórico não muda (e a recompensa pode até
/// ser soft-deletada sem sumir do extrato do resgate).
/// </summary>
public class LoyaltyRedemption : BaseEntity
{
    public Guid ClientId { get; set; }
    public Guid RewardId { get; set; }
    public string RewardName { get; set; } = string.Empty;
    public int CostPaid { get; set; }
    public LoyaltyRedemptionStatus Status { get; set; } = LoyaltyRedemptionStatus.Pending;
    // Quando saiu de Pending (entregue ou cancelado). Data do resgate = CreatedAt.
    public DateTime? ResolvedAt { get; set; }

    public Client? Client { get; set; }
    public LoyaltyReward? Reward { get; set; }
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
