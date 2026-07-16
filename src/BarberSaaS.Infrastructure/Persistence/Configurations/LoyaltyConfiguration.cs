using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class LoyaltyProgramConfiguration : IEntityTypeConfiguration<LoyaltyProgram>
{
    public void Configure(EntityTypeBuilder<LoyaltyProgram> b)
    {
        b.ToTable("LoyaltyPrograms");
        b.HasKey(x => x.Id);

        b.Property(x => x.Mode).HasConversion<byte>();
        b.Property(x => x.PointsPerReal).HasColumnType("decimal(10,4)");
        b.Property(x => x.RedemptionRate).HasColumnType("decimal(10,4)");

        // Um programa por barbearia (tabela vazia hoje — nenhum código escrevia nela).
        b.HasIndex(x => x.TenantId).IsUnique();
    }
}

public class LoyaltyWalletConfiguration : IEntityTypeConfiguration<LoyaltyWallet>
{
    public void Configure(EntityTypeBuilder<LoyaltyWallet> b)
    {
        b.ToTable("LoyaltyWallets");
        b.HasKey(x => x.Id);

        b.Property(x => x.CashbackBalance).HasColumnType("decimal(10,2)");

        b.HasMany(x => x.Transactions)
            .WithOne(x => x.Wallet)
            .HasForeignKey(x => x.WalletId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class LoyaltyTransactionConfiguration : IEntityTypeConfiguration<LoyaltyTransaction>
{
    public void Configure(EntityTypeBuilder<LoyaltyTransaction> b)
    {
        b.ToTable("LoyaltyTransactions");
        b.HasKey(x => x.Id);

        b.Property(x => x.Type).HasConversion<byte>();
        b.Property(x => x.CashbackAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.Description).HasMaxLength(300).IsRequired();
    }
}

public class LoyaltyRewardConfiguration : IEntityTypeConfiguration<LoyaltyReward>
{
    public void Configure(EntityTypeBuilder<LoyaltyReward> b)
    {
        b.ToTable("LoyaltyRewards");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Type).HasConversion<byte>();

        // Restrict: serviços/produtos são soft-deletados no app; um hard delete
        // acidental não pode apagar recompensas silenciosamente.
        b.HasOne(x => x.Service).WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.TenantId, x.IsActive });
    }
}

public class LoyaltyRedemptionConfiguration : IEntityTypeConfiguration<LoyaltyRedemption>
{
    public void Configure(EntityTypeBuilder<LoyaltyRedemption> b)
    {
        b.ToTable("LoyaltyRedemptions");
        b.HasKey(x => x.Id);

        b.Property(x => x.RewardName).HasMaxLength(150).IsRequired();
        b.Property(x => x.Status).HasConversion<byte>();

        b.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Reward).WithMany().HasForeignKey(x => x.RewardId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.CreatedAt });
    }
}

public class CouponConfiguration : IEntityTypeConfiguration<Coupon>
{
    public void Configure(EntityTypeBuilder<Coupon> b)
    {
        b.ToTable("Coupons");
        b.HasKey(x => x.Id);

        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.DiscountType).HasConversion<byte>();
        b.Property(x => x.DiscountValue).HasColumnType("decimal(10,2)");
        b.Property(x => x.MinOrderValue).HasColumnType("decimal(10,2)");

        b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
    }
}
