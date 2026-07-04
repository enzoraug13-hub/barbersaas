using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class BarberGoogleCredentialConfiguration : IEntityTypeConfiguration<BarberGoogleCredential>
{
    public void Configure(EntityTypeBuilder<BarberGoogleCredential> b)
    {
        b.ToTable("BarberGoogleCredentials");
        b.HasKey(x => x.Id);

        // Um único vínculo Google por barbeiro (a linha é substituída ao reconectar).
        b.HasIndex(x => x.BarberId).IsUnique();

        b.Property(x => x.GoogleEmail).HasMaxLength(320);
        // Tokens cifrados em Base64 — access tokens do Google chegam perto de 2KB.
        b.Property(x => x.AccessToken).HasMaxLength(4000).IsRequired();
        b.Property(x => x.RefreshToken).HasMaxLength(2000).IsRequired();

        b.HasOne(x => x.Barber)
            .WithOne()
            .HasForeignKey<BarberGoogleCredential>(x => x.BarberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
