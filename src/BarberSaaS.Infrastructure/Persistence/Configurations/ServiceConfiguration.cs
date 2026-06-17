using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> b)
    {
        b.ToTable("Services");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Price).HasColumnType("decimal(10,2)");
        b.Property(x => x.ColorHex).HasMaxLength(10);
        b.Property(x => x.ImageUrl).HasMaxLength(500);

        b.HasMany(x => x.BarberServices)
            .WithOne(x => x.Service)
            .HasForeignKey(x => x.ServiceId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Appointments)
            .WithOne(x => x.Service)
            .HasForeignKey(x => x.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class BarberServiceConfiguration : IEntityTypeConfiguration<BarberService>
{
    public void Configure(EntityTypeBuilder<BarberService> b)
    {
        b.ToTable("BarberServices");
        b.HasKey(x => new { x.BarberId, x.ServiceId });

        b.Property(x => x.CustomPrice).HasColumnType("decimal(10,2)");

        b.HasQueryFilter(x => !x.Barber!.IsDeleted && !x.Service!.IsDeleted);
    }
}
