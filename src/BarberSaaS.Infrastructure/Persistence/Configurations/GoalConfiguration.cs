using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> b)
    {
        b.ToTable("Goals");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.TargetAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.CurrentAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.ImageUrl).HasMaxLength(500);
        b.Property(x => x.Status).HasConversion<byte>();

        b.Ignore(x => x.PercentageComplete);
        b.Ignore(x => x.RemainingAmount);
        b.Ignore(x => x.IsCompleted);

        b.HasMany(x => x.Contributions)
            .WithOne(x => x.Goal)
            .HasForeignKey(x => x.GoalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class GoalContributionConfiguration : IEntityTypeConfiguration<GoalContribution>
{
    public void Configure(EntityTypeBuilder<GoalContribution> b)
    {
        b.ToTable("GoalContributions");
        b.HasKey(x => x.Id);

        b.Property(x => x.Amount).HasColumnType("decimal(10,2)");
        b.Property(x => x.Notes).HasMaxLength(300);
    }
}
