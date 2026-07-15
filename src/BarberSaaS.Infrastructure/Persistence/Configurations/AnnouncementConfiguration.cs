using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> b)
    {
        b.ToTable("Announcements");
        b.HasKey(x => x.Id);

        b.Property(x => x.Title).IsRequired().HasMaxLength(150);
        b.Property(x => x.Body).IsRequired().HasMaxLength(2000);

        // Consulta do dono: broadcast (null) + os do próprio tenant, mais recentes primeiro.
        b.HasIndex(x => new { x.TargetTenantId, x.CreatedAt });

        b.HasOne(x => x.TargetTenant)
            .WithMany()
            .HasForeignKey(x => x.TargetTenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AnnouncementReadConfiguration : IEntityTypeConfiguration<AnnouncementRead>
{
    public void Configure(EntityTypeBuilder<AnnouncementRead> b)
    {
        b.ToTable("AnnouncementReads");
        b.HasKey(x => x.Id);

        // Um "lido" por aviso+barbearia. Filtrado por IsDeleted pelo mesmo motivo
        // do índice de Invoices: soft-delete libera o slot.
        b.HasIndex(x => new { x.AnnouncementId, x.TenantId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        b.HasOne(x => x.Announcement)
            .WithMany()
            .HasForeignKey(x => x.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
