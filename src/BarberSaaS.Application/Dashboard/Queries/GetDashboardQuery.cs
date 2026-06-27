using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Dashboard.Queries;

public record GetDashboardQuery(Guid TenantId, DateOnly StartDate, DateOnly EndDate) : IRequest<DashboardDto>;

public record DashboardDto(
    decimal TotalRevenue,
    decimal TotalExpense,
    decimal NetProfit,
    decimal AverageTicket,
    int TotalAppointments,
    int CancelledCount,
    int CompletedCount,
    int UniqueClients,
    decimal CancellationRate,
    IReadOnlyList<TopServiceDto> TopServices,
    IReadOnlyList<DailyRevenueDto> DailyRevenue);

public record TopServiceDto(string Name, int Count, decimal Revenue);
public record DailyRevenueDto(string Date, decimal Revenue, decimal Expense, int Appointments);

public class GetDashboardHandler : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    private readonly IDashboardRepository _dashboard;
    private readonly ICacheService _cache;

    public GetDashboardHandler(IDashboardRepository dashboard, ICacheService cache)
    {
        _dashboard = dashboard; _cache = cache;
    }

    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken ct)
    {
        var cacheKey = $"dashboard:{request.TenantId}:{request.StartDate:yyyyMMdd}:{request.EndDate:yyyyMMdd}";
        return await _cache.GetOrSetAsync(cacheKey,
            () => _dashboard.GetSummaryAsync(request.TenantId, request.StartDate, request.EndDate, ct),
            TimeSpan.FromMinutes(5));
    }
}

public interface IDashboardRepository
{
    Task<DashboardDto> GetSummaryAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<IReadOnlyList<MonthlyRevenueDto>> GetMonthlyRevenueAsync(Guid tenantId, int months, CancellationToken ct = default);
    Task<IReadOnlyList<BarberPerformanceDto>> GetBarberPerformanceAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
    Task<IReadOnlyList<Barbers.Queries.BarberMonthlyPointDto>> GetBarberMonthlySeriesAsync(Guid tenantId, Guid barberId, int months, CancellationToken ct = default);
    Task<PaymentMethodsDto> GetPaymentMethodsAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default);
}
