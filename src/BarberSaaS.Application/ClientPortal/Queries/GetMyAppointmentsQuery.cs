using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Queries;

public record GetMyAppointmentsQuery : IRequest<IReadOnlyList<MyAppointmentDto>>;

public record MyAppointmentDto(
    Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime,
    decimal FinalPrice, string Status, string Barber, string Service);

public class GetMyAppointmentsHandler : IRequestHandler<GetMyAppointmentsQuery, IReadOnlyList<MyAppointmentDto>>
{
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly ICurrentUser _user;

    public GetMyAppointmentsHandler(IAppointmentRepositoryFull appointments, ICurrentUser user)
    {
        _appointments = appointments; _user = user;
    }

    public async Task<IReadOnlyList<MyAppointmentDto>> Handle(GetMyAppointmentsQuery request, CancellationToken ct)
    {
        var list = await _appointments.GetByClientAsync(_user.Id, ct);
        return list.Select(a => new MyAppointmentDto(
            a.Id, a.Date, a.StartTime, a.EndTime, a.FinalPrice,
            a.Status.ToString(), a.Barber!.Name, a.Service!.Name)).ToList();
    }
}
