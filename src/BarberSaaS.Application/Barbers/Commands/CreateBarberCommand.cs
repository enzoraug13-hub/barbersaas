using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

public record CreateBarberCommand(
    Guid TenantId,
    string Name,
    string Email,
    string Password,
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
    int DisplayOrder);

public class CreateBarberValidator : AbstractValidator<CreateBarberCommand>
{
    public CreateBarberValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.CommissionValue).InclusiveBetween(0, 100);
    }
}

public class CreateBarberHandler : IRequestHandler<CreateBarberCommand, BarberDto>
{
    private readonly IBarberRepository _barbers;
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;

    public CreateBarberHandler(IBarberRepository barbers, IUserRepository users, IPasswordHasher hasher)
    {
        _barbers = barbers; _users = users; _hasher = hasher;
    }

    public async Task<BarberDto> Handle(CreateBarberCommand request, CancellationToken ct)
    {
        var emailExists = await _users.EmailExistsAsync(request.Email, ct);
        if (emailExists) throw new InvalidOperationException("Este e-mail já está em uso.");

        var user = new User
        {
            TenantId     = request.TenantId,
            Name         = request.Name,
            Email        = request.Email,
            PasswordHash = _hasher.Hash(request.Password),
            Role         = UserRole.Barber,
            IsActive     = true
        };
        await _users.AddAsync(user, ct);

        var barber = new Barber
        {
            TenantId        = request.TenantId,
            UserId          = user.Id,
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

        return new BarberDto(barber.Id, barber.Name, barber.PhotoUrl, barber.Bio, barber.Phone, barber.IsActive, barber.ShowInPublicPage, barber.GoogleCalendarId, barber.DisplayOrder);
    }
}
