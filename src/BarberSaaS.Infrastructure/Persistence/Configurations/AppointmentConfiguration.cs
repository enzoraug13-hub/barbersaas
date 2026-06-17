using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> b)
    {
        b.ToTable("Appointments");
        b.HasKey(x => x.Id);

        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.PaymentMethod).HasConversion<byte>();
        b.Property(x => x.ServicePrice).HasColumnType("decimal(10,2)");
        b.Property(x => x.DiscountAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.FinalPrice).HasColumnType("decimal(10,2)");
        b.Property(x => x.Notes).HasMaxLength(500);
        b.Property(x => x.InternalNotes).HasMaxLength(500);
        b.Property(x => x.CancelReason).HasMaxLength(300);
        b.Property(x => x.GoogleEventId).HasMaxLength(200);
        b.Property(x => x.GoogleSyncError).HasMaxLength(500);

        b.HasIndex(x => new { x.BarberId, x.Date, x.StartTime });
        b.HasIndex(x => new { x.TenantId, x.Date });
        b.HasIndex(x => x.ClientId);

        b.HasOne(x => x.Barber)
            .WithMany(x => x.Appointments)
            .HasForeignKey(x => x.BarberId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Client)
            .WithMany(x => x.Appointments)
            .HasForeignKey(x => x.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Service)
            .WithMany(x => x.Appointments)
            .HasForeignKey(x => x.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
