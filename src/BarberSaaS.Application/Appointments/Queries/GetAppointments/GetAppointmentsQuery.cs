using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.Appointments.Queries.GetAppointments;

public record GetAppointmentsQuery(Guid TenantId, DateOnly Date, Guid? BarberId = null) : IRequest<IReadOnlyList<AppointmentListDto>>;

public record AppointmentListDto(
    Guid Id,
    string ClientName,
    string ClientPhone,
    string BarberName,
    string ServiceName,
    string Date,
    string StartTime,
    string EndTime,
    decimal FinalPrice,
    AppointmentStatus Status,
    string? Notes,
    bool IsPaid,
    string? GoogleEventId);

public class GetAppointmentsHandler : IRequestHandler<GetAppointmentsQuery, IReadOnlyList<AppointmentListDto>>
{
    private readonly IAppointmentRepositoryFull _appointments;

    public GetAppointmentsHandler(IAppointmentRepositoryFull appointments)
        => _appointments = appointments;

    public async Task<IReadOnlyList<AppointmentListDto>> Handle(GetAppointmentsQuery request, CancellationToken ct)
    {
        var appts = await _appointments.GetByTenantAndDateAsync(request.TenantId, request.Date, request.BarberId, ct);
        return appts.Select(a => new AppointmentListDto(
            a.Id,
            a.Client?.Name ?? "",
            a.Client?.PhoneNumber ?? "",
            a.Barber?.Name ?? "",
            a.Service?.Name ?? "",
            a.Date.ToString("dd/MM/yyyy"),
            a.StartTime.ToString("HH:mm"),
            a.EndTime.ToString("HH:mm"),
            a.FinalPrice,
            a.Status,
            a.Notes,
            a.IsPaid,
            a.GoogleEventId)).ToList();
    }
}
