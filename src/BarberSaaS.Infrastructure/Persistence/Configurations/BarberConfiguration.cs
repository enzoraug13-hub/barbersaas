using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class BarberConfiguration : IEntityTypeConfiguration<Barber>
{
    public void Configure(EntityTypeBuilder<Barber> b)
    {
        b.ToTable("Barbers");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.PhotoUrl).HasMaxLength(500);
        b.Property(x => x.Bio).HasMaxLength(500);
        b.Property(x => x.Phone).HasMaxLength(30);
        b.Property(x => x.GoogleCalendarId).HasMaxLength(200);
        b.Property(x => x.GoogleCalendarColor).HasMaxLength(30);
        b.Property(x => x.CommissionType).HasConversion<byte>();
        b.Property(x => x.CommissionValue).HasColumnType("decimal(10,2)");
        b.Property(x => x.ChairRentAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.ChairRentPeriod).HasConversion<byte?>();

        b.HasMany(x => x.WorkSchedules)
            .WithOne(x => x.Barber)
            .HasForeignKey(x => x.BarberId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.DaysOff)
            .WithOne(x => x.Barber)
            .HasForeignKey(x => x.BarberId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Appointments)
            .WithOne(x => x.Barber)
            .HasForeignKey(x => x.BarberId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.BarberServices)
            .WithOne(x => x.Barber)
            .HasForeignKey(x => x.BarberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class WorkScheduleConfiguration : IEntityTypeConfiguration<WorkSchedule>
{
    public void Configure(EntityTypeBuilder<WorkSchedule> b)
    {
        b.ToTable("WorkSchedules");
        b.HasKey(x => x.Id);

        b.HasMany(x => x.WorkShifts)
            .WithOne(x => x.WorkSchedule)
            .HasForeignKey(x => x.WorkScheduleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class WorkShiftConfiguration : IEntityTypeConfiguration<WorkShift>
{
    public void Configure(EntityTypeBuilder<WorkShift> b)
    {
        b.ToTable("WorkShifts");
        b.HasKey(x => x.Id);
        b.Property(x => x.DayOfWeek).HasConversion<byte>();

        b.HasMany(x => x.Breaks)
            .WithOne(x => x.WorkShift)
            .HasForeignKey(x => x.WorkShiftId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ShiftBreakConfiguration : IEntityTypeConfiguration<ShiftBreak>
{
    public void Configure(EntityTypeBuilder<ShiftBreak> b)
    {
        b.ToTable("ShiftBreaks");
        b.HasKey(x => x.Id);
    }
}

public class DayOffConfiguration : IEntityTypeConfiguration<DayOff>
{
    public void Configure(EntityTypeBuilder<DayOff> b)
    {
        b.ToTable("DaysOff");
        b.HasKey(x => x.Id);
        b.Property(x => x.Reason).HasMaxLength(300);
        b.HasIndex(x => new { x.BarberId, x.Date });
    }
}
