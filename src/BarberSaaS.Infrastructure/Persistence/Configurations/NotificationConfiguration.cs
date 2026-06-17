using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class NotificationTemplateConfiguration : IEntityTypeConfiguration<NotificationTemplate>
{
    public void Configure(EntityTypeBuilder<NotificationTemplate> b)
    {
        b.ToTable("NotificationTemplates");
        b.HasKey(x => x.Id);

        b.Property(x => x.EventType).HasConversion<byte>();
        b.Property(x => x.Channel).HasConversion<byte>();
        b.Property(x => x.Subject).HasMaxLength(200);
        b.Property(x => x.Body).HasMaxLength(2000).IsRequired();
    }
}

public class NotificationQueueConfiguration : IEntityTypeConfiguration<NotificationQueue>
{
    public void Configure(EntityTypeBuilder<NotificationQueue> b)
    {
        b.ToTable("NotificationQueue");
        b.HasKey(x => x.Id);

        b.Property(x => x.Channel).HasConversion<byte>();
        b.Property(x => x.EventType).HasConversion<byte>();
        b.Property(x => x.Status).HasConversion<byte>();
        b.Property(x => x.RecipientPhone).HasMaxLength(30);
        b.Property(x => x.RecipientEmail).HasMaxLength(200);
        b.Property(x => x.Subject).HasMaxLength(200);
        b.Property(x => x.Body).HasMaxLength(2000).IsRequired();
        b.Property(x => x.FailureReason).HasMaxLength(500);

        b.HasIndex(x => new { x.Status, x.ScheduledAt });
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("AuditLogs");
        b.HasKey(x => x.Id);

        b.Property(x => x.Action).HasMaxLength(100).IsRequired();
        b.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
        b.Property(x => x.EntityId).HasMaxLength(50).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.IpAddress).HasMaxLength(50);
        b.Property(x => x.UserAgent).HasMaxLength(300);
        b.Property(x => x.CorrelationId).HasMaxLength(100);
        b.Property(x => x.UserName).HasMaxLength(150);
        b.Property(x => x.UserRole).HasMaxLength(50);
        b.Property(x => x.ErrorMessage).HasMaxLength(1000);

        b.HasIndex(x => new { x.TenantId, x.CreatedAt });
        b.HasIndex(x => new { x.EntityType, x.EntityId });
    }
}
