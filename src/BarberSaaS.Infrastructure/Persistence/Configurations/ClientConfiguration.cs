using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> b)
    {
        b.ToTable("Clients");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.PhoneNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Email).HasMaxLength(200);
        b.Property(x => x.PhotoUrl).HasMaxLength(500);
        b.Property(x => x.OtpCode).HasMaxLength(10);
        b.Property(x => x.BlockReason).HasMaxLength(300);
        b.Property(x => x.WalletBalance).HasColumnType("decimal(10,2)");

        b.HasIndex(x => new { x.TenantId, x.PhoneNumber }).IsUnique();

        b.HasMany(x => x.Appointments)
            .WithOne(x => x.Client)
            .HasForeignKey(x => x.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.LoyaltyWallet)
            .WithOne(x => x.Client)
            .HasForeignKey<LoyaltyWallet>(x => x.ClientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
