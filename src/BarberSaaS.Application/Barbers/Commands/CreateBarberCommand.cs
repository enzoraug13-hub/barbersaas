using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

// Barbeiro não tem login próprio — é só um recurso da agenda do tenant,
// por isso não pede e-mail/senha nem cria User.
public record CreateBarberCommand(
    Guid TenantId,
    string Name,
    string? Phone,
    string? Bio,
    CommissionType CommissionType,
    decimal CommissionValue,
    string? GoogleCalendarId) : IRequest<BarberDto>;

public record BarberDto(
    Guid Id,
    string Name,
    string? PhotoUrl,
    string? Bio,
    string? Phone,
    bool IsActive,
    bool ShowInPublicPage,
    string? GoogleCalendarId,
    int DisplayOrder,
    int CommissionType,
    decimal CommissionValue);

public class CreateBarberValidator : AbstractValidator<CreateBarberCommand>
{
    public CreateBarberValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.CommissionValue).InclusiveBetween(0, 100);
    }
}

public class CreateBarberHandler : IRequestHandler<CreateBarberCommand, BarberDto>
{
    private readonly IBarberRepository _barbers;

    public CreateBarberHandler(IBarberRepository barbers)
    {
        _barbers = barbers;
    }

    public async Task<BarberDto> Handle(CreateBarberCommand request, CancellationToken ct)
    {
        var barber = new Barber
        {
            TenantId        = request.TenantId,
            Name            = request.Name,
            Phone           = request.Phone,
            Bio             = request.Bio,
            CommissionType  = request.CommissionType,
            CommissionValue = request.CommissionValue,
            GoogleCalendarId = request.GoogleCalendarId
        };

        // WorkSchedule padrão: Seg-Sex 09h-12h e 13h-19h
        var schedule = new WorkSchedule { TenantId = request.TenantId, BarberId = barber.Id };
        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday };
        foreach (var day in weekdays)
        {
            schedule.WorkShifts.Add(new WorkShift { TenantId = request.TenantId, WorkScheduleId = schedule.Id, DayOfWeek = day, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(12, 0) });
            schedule.WorkShifts.Add(new WorkShift { TenantId = request.TenantId, WorkScheduleId = schedule.Id, DayOfWeek = day, StartTime = new TimeOnly(13, 0), EndTime = new TimeOnly(19, 0) });
        }
        barber.WorkSchedules.Add(schedule);

        await _barbers.AddAsync(barber, ct);

        return new BarberDto(barber.Id, barber.Name, barber.PhotoUrl, barber.Bio, barber.Phone, barber.IsActive, barber.ShowInPublicPage, barber.GoogleCalendarId, barber.DisplayOrder, (int)barber.CommissionType, barber.CommissionValue);
    }
}
