using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class SupportMessageConfiguration : IEntityTypeConfiguration<SupportMessage>
{
    public void Configure(EntityTypeBuilder<SupportMessage> b)
    {
        b.ToTable("SupportMessages");
        b.HasKey(x => x.Id);

        b.Property(x => x.Author).HasConversion<byte>();
        b.Property(x => x.Body).IsRequired().HasMaxLength(2000);

        // A conversa é o tenant: listagem cronológica por barbearia, e o GroupBy
        // do super admin (última mensagem + não-lidas por tenant) anda no mesmo índice.
        b.HasIndex(x => new { x.TenantId, x.CreatedAt });

        b.HasOne(x => x.Tenant)
            .WithMany()
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
