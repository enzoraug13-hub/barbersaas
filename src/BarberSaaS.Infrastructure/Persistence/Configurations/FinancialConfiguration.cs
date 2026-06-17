using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class FinancialTransactionConfiguration : IEntityTypeConfiguration<FinancialTransaction>
{
    public void Configure(EntityTypeBuilder<FinancialTransaction> b)
    {
        b.ToTable("FinancialTransactions");
        b.HasKey(x => x.Id);

        b.Property(x => x.Type).HasConversion<byte>();
        b.Property(x => x.Category).HasConversion<byte>();
        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.Description).HasMaxLength(300).IsRequired();
        b.Property(x => x.Amount).HasColumnType("decimal(10,2)");
        b.Property(x => x.PaidAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.Notes).HasMaxLength(500);

        b.HasIndex(x => new { x.TenantId, x.TransactionDate });
        b.HasIndex(x => new { x.TenantId, x.Type });

        b.HasOne(x => x.Appointment)
            .WithMany()
            .HasForeignKey(x => x.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne(x => x.Barber)
            .WithMany()
            .HasForeignKey(x => x.BarberId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(x => x.Payments)
            .WithOne(x => x.Transaction)
            .HasForeignKey(x => x.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class FinancialPaymentConfiguration : IEntityTypeConfiguration<FinancialPayment>
{
    public void Configure(EntityTypeBuilder<FinancialPayment> b)
    {
        b.ToTable("FinancialPayments");
        b.HasKey(x => x.Id);

        b.Property(x => x.Amount).HasColumnType("decimal(10,2)");
        b.Property(x => x.PaymentMethod).HasConversion<byte>();
        b.Property(x => x.Notes).HasMaxLength(300);
    }
}
