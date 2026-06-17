using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> b)
    {
        b.ToTable("Tenants");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();

        b.HasMany(x => x.Users)
            .WithOne(x => x.Tenant)
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Barbers)
            .WithOne(x => x.Tenant)
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Clients)
            .WithOne(x => x.Tenant)
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Services)
            .WithOne(x => x.Tenant)
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Settings)
            .WithOne(x => x.Tenant)
            .HasForeignKey<TenantSettings>(x => x.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Subscription)
            .WithOne(x => x.Tenant)
            .HasForeignKey<Subscription>(x => x.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class TenantSettingsConfiguration : IEntityTypeConfiguration<TenantSettings>
{
    public void Configure(EntityTypeBuilder<TenantSettings> b)
    {
        b.ToTable("TenantSettings");
        b.HasKey(x => x.Id);

        b.Property(x => x.BusinessName).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Address).HasMaxLength(300);
        b.Property(x => x.City).HasMaxLength(100);
        b.Property(x => x.State).HasMaxLength(50);
        b.Property(x => x.ZipCode).HasMaxLength(20);
        b.Property(x => x.Phone).HasMaxLength(30);
        b.Property(x => x.WhatsAppNumber).HasMaxLength(30);
        b.Property(x => x.InstagramUrl).HasMaxLength(200);
        b.Property(x => x.LogoUrl).HasMaxLength(500);
        b.Property(x => x.CoverImageUrl).HasMaxLength(500);
        b.Property(x => x.PrimaryColor).HasMaxLength(10).HasDefaultValue("#1a1a1a");
        b.Property(x => x.SecondaryColor).HasMaxLength(10).HasDefaultValue("#c9a84c");
        b.Property(x => x.AccentColor).HasMaxLength(10).HasDefaultValue("#ffffff");
        b.Property(x => x.PublicSlug).HasMaxLength(100);
    }
}
