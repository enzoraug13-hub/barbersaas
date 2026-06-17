using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> b)
    {
        b.ToTable("Plans");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(50).IsRequired();
        b.Property(x => x.Description).HasMaxLength(300);
        b.Property(x => x.MonthlyPrice).HasColumnType("decimal(10,2)");
        b.Property(x => x.YearlyPrice).HasColumnType("decimal(10,2)");
        b.Property(x => x.Features).HasMaxLength(2000).HasDefaultValue("{}");

        b.HasIndex(x => x.Slug).IsUnique();
    }
}

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> b)
    {
        b.ToTable("Subscriptions");
        b.HasKey(x => x.Id);

        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.BillingCycle).HasConversion<byte>();
        b.Property(x => x.CancelReason).HasMaxLength(300);
        b.Property(x => x.ExternalCustomerId).HasMaxLength(200);
        b.Property(x => x.ExternalSubId).HasMaxLength(200);

        b.HasOne(x => x.Plan)
            .WithMany()
            .HasForeignKey(x => x.PlanId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Payments)
            .WithOne(x => x.Subscription)
            .HasForeignKey(x => x.SubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SubscriptionPaymentConfiguration : IEntityTypeConfiguration<SubscriptionPayment>
{
    public void Configure(EntityTypeBuilder<SubscriptionPayment> b)
    {
        b.ToTable("SubscriptionPayments");
        b.HasKey(x => x.Id);

        b.Property(x => x.Amount).HasColumnType("decimal(10,2)");
        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.PaymentMethod).HasMaxLength(50);
        b.Property(x => x.ExternalPaymentId).HasMaxLength(200);
        b.Property(x => x.FailureReason).HasMaxLength(500);
    }
}
