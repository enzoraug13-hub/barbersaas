using MediatR;

namespace BarberSaaS.Application.Dashboard.Queries;

public record GetMonthlyRevenueQuery(Guid TenantId, int Months) : IRequest<IReadOnlyList<MonthlyRevenueDto>>;

public record MonthlyRevenueDto(string Month, decimal Revenue, decimal Expense);

public class GetMonthlyRevenueHandler : IRequestHandler<GetMonthlyRevenueQuery, IReadOnlyList<MonthlyRevenueDto>>
{
    private readonly IDashboardRepository _dashboard;

    public GetMonthlyRevenueHandler(IDashboardRepository dashboard) => _dashboard = dashboard;

    public Task<IReadOnlyList<MonthlyRevenueDto>> Handle(GetMonthlyRevenueQuery request, CancellationToken ct)
        => _dashboard.GetMonthlyRevenueAsync(request.TenantId, request.Months, ct);
}
