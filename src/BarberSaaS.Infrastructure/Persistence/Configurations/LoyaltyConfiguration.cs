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

        b.Property(x => x.PointsPerReal).HasColumnType("decimal(10,4)");
        b.Property(x => x.RedemptionRate).HasColumnType("decimal(10,4)");
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
