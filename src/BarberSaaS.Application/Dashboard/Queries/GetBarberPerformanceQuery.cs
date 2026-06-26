using MediatR;

namespace BarberSaaS.Application.Dashboard.Queries;

public record GetBarberPerformanceQuery(Guid TenantId, DateOnly StartDate, DateOnly EndDate) : IRequest<IReadOnlyList<BarberPerformanceDto>>;

// WeeklyAppointments: 7 posições, índice 0 = segunda, 6 = domingo.
public record BarberPerformanceDto(
    Guid Id,
    string Name,
    string? PhotoUrl,
    bool IsActive,
    int TotalAppointments,
    decimal Revenue,
    decimal OccupancyRate,
    IReadOnlyList<int> WeeklyAppointments);

public class GetBarberPerformanceHandler : IRequestHandler<GetBarberPerformanceQuery, IReadOnlyList<BarberPerformanceDto>>
{
    private readonly IDashboardRepository _dashboard;

    public GetBarberPerformanceHandler(IDashboardRepository dashboard) => _dashboard = dashboard;

    public Task<IReadOnlyList<BarberPerformanceDto>> Handle(GetBarberPerformanceQuery request, CancellationToken ct)
        => _dashboard.GetBarberPerformanceAsync(request.TenantId, request.StartDate, request.EndDate, ct);
}
