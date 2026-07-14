using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> b)
    {
        b.ToTable("Invoices");
        b.HasKey(x => x.Id);

        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.Amount).HasColumnType("decimal(10,2)");
        b.Property(x => x.ReceiptUrl).HasMaxLength(500);
        b.Property(x => x.Notes).HasMaxLength(500);

        // Uma fatura por tenant/competência: evita cobrar o mesmo mês duas vezes
        // por engano. Filtrado por IsDeleted pra que um soft-delete libere o slot.
        b.HasIndex(x => new { x.TenantId, x.CompetenceYear, x.CompetenceMonth })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        b.HasIndex(x => new { x.Status, x.DueDate });

        b.HasOne(x => x.Tenant)
            .WithMany()
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
